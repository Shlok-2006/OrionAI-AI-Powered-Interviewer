import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { LiveKitService } from '../services/livekit.service';
import { LangGraphService, InterviewState } from '../services/langgraph.service';
import { GeminiService } from '../services/gemini.service';
import { GroqService } from '../services/groq.service';
import { SessionLockManager } from '../utils/lock.manager';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { InterviewType } from '@prisma/client';

const startInterviewSchema = z.object({
  type: z.nativeEnum(InterviewType),
});

const submitMessageSchema = z.object({
  sessionId: z.string().uuid(),
  message: z.string().min(1, 'Message content cannot be empty'),
});

export class InterviewController {
  /**
   * Start a new mock interview session.
   */
  static async start(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!SessionLockManager.acquire(userId)) {
      res.status(429).json({ error: 'Another interview is currently starting. Please wait.' });
      return;
    }

    try {
      const { type } = startInterviewSchema.parse(req.body);

      // Get user profile info
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Check if there is an active session started in the last 15 seconds to prevent duplicate starts
      const recentSession = await prisma.interviewSession.findFirst({
        where: {
          userId,
          type,
          status: 'STARTED',
          createdAt: {
            gte: new Date(Date.now() - 15000), // 15 seconds ago
          },
        },
        orderBy: { createdAt: 'desc' },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (recentSession && recentSession.messages.length > 0) {
        logger.info(`[Start] Reusing recently created session ${recentSession.id} to prevent duplicate call`);
        const openingMessage = recentSession.messages.find((m) => m.role === 'ASSISTANT')?.content || 'Hello, let us start the interview.';
        const livekitToken = await LiveKitService.generateToken(recentSession.livekitRoom, user.id, user.name);
        
        res.status(200).json({
          sessionId: recentSession.id,
          livekitRoom: recentSession.livekitRoom,
          livekitToken,
          openingMessage,
        });
        return;
      }

      // Generate a unique room name for LiveKit
      const roomName = `interview-${type.toLowerCase()}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      // Create room in LiveKit Cloud (non-blocking)
      await LiveKitService.createRoom(roomName);

      // Generate access token for the client to join
      const livekitToken = await LiveKitService.generateToken(roomName, user.id, user.name);

      // Create InterviewSession in the database
      const session = await prisma.interviewSession.create({
        data: {
          userId,
          type,
          livekitRoom: roomName,
          status: 'STARTED',
          questionCount: 0,
          difficulty: 'EASY',
        },
      });

      // Run LangGraph to generate the welcoming introduction and the first question
      const initialState: InterviewState = {
        messages: [],
        jobRole: user.jobRole,
        experienceLevel: user.experienceLevel,
        candidateName: user.name,
        interviewType: type,
        questionCount: 0,
        maxQuestions: env.MAX_QUESTIONS_PER_SESSION,
        difficulty: 'EASY',
      };

      const graphResult = await LangGraphService.runInterview(initialState);
      const openingMessage = graphResult.responseContent || 'Hello, let us start the interview.';

      // Save the generated assistant message in the database
      await prisma.conversation.create({
        data: {
          sessionId: session.id,
          role: 'ASSISTANT',
          content: openingMessage,
        },
      });

      // Update the session question count
      await prisma.interviewSession.update({
        where: { id: session.id },
        data: { questionCount: 1 },
      });

      res.status(201).json({
        sessionId: session.id,
        livekitRoom: roomName,
        livekitToken,
        openingMessage,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors[0].message });
        return;
      }
      if (GeminiService.isRateLimitError(error)) {
        res.status(429).json({ error: 'Gemini API is busy (rate limit exceeded). Please wait 15 seconds and try starting again.' });
        return;
      }
      next(error);
    } finally {
      SessionLockManager.release(userId);
    }
  }

  /**
   * Submit a candidate's answer transcript and receive the next AI response.
   */
  static async message(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    let parsedData;
    try {
      parsedData = submitMessageSchema.parse(req.body);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors[0].message });
        return;
      }
      next(error);
      return;
    }

    const { sessionId, message } = parsedData;

    if (!SessionLockManager.acquire(sessionId)) {
      res.status(429).json({ error: 'AI is currently thinking... Please wait a few moments.' });
      return;
    }

    try {
      // Fetch the session and verify ownership
      const session = await prisma.interviewSession.findUnique({
        where: { id: sessionId },
        include: {
          user: true,
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!session) {
        res.status(404).json({ error: 'Interview session not found' });
        return;
      }

      if (session.userId !== userId) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      if (session.status === 'COMPLETED') {
        res.status(400).json({ error: 'This interview session has already ended' });
        return;
      }

      // 1. Save the candidate's answer transcript in the database
      await prisma.conversation.create({
        data: {
          sessionId,
          role: 'USER',
          content: message,
        },
      });

      // Map DB messages to LangGraph state messages
      const graphMessages = session.messages.map((msg) => ({
        role: msg.role === 'USER' ? ('user' as const) : ('assistant' as const),
        content: msg.content,
      }));

      // Append the new user message
      graphMessages.push({ role: 'user', content: message });

      // 2. Prepare and run the LangGraph
      const currentState: InterviewState = {
        messages: graphMessages,
        jobRole: session.user.jobRole,
        experienceLevel: session.user.experienceLevel,
        candidateName: session.user.name,
        interviewType: session.type,
        questionCount: session.questionCount,
        maxQuestions: env.MAX_QUESTIONS_PER_SESSION,
        difficulty: session.difficulty as 'EASY' | 'MEDIUM' | 'HARD',
      };

      const resultState = await LangGraphService.runInterview(currentState);
      const aiResponse = resultState.responseContent || '';

      // 3. Check if the graph decided to end the interview and generate a report
      if (resultState.nextAction === 'REPORT') {
        let reportData;
        try {
          reportData = JSON.parse(aiResponse);
        } catch (e) {
          logger.error('Failed to parse AI report JSON, raw content:', aiResponse);
          throw new Error('Failed to generate a valid structured feedback report.');
        }

        // Save the feedback report in the database
        const feedback = await prisma.feedback.create({
          data: {
            sessionId,
            overallScore: reportData.overallScore,
            communicationScore: reportData.communicationScore,
            technicalScore: reportData.technicalScore,
            confidenceScore: reportData.confidenceScore,
            leadershipScore: reportData.leadershipScore,
            problemSolvingScore: reportData.problemSolvingScore,
            strengths: reportData.strengths,
            weaknesses: reportData.weaknesses,
            suggestions: reportData.suggestions,
            overallSummary: reportData.overallSummary,
          },
        });

        // Mark the session as COMPLETED
        await prisma.interviewSession.update({
          where: { id: sessionId },
          data: { status: 'COMPLETED' },
        });

        // Terminate/Delete LiveKit Room since interview is over
        await LiveKitService.deleteRoom(session.livekitRoom);

        // Generate a custom, warm closing message for the AI to speak
        const outroSystemPrompt = `You are an AI Interviewer concluding an interview.`;
        const outroPrompt = `The candidate's name is "${session.user.name}". 
Conclude the interview warmly and professionally. 
Tell them that the interview is now complete, you have gathered all the necessary information, and their detailed feedback report will now be generated and displayed on their screen.
Keep it to 2-3 sentences total. Do NOT use any placeholders.`;

        let closingMessage = `Thank you, ${session.user.name}. That concludes our interview today. Your detailed feedback report will now be generated and displayed on your screen. Great job!`;
        try {
          if (GroqService.isEnabled()) {
            closingMessage = await GroqService.generateText(outroSystemPrompt, '', outroPrompt);
          } else {
            closingMessage = await GeminiService.generateText(outroSystemPrompt, [], outroPrompt);
          }
        } catch (err) {
          logger.warn('Failed to generate custom closing message, using default:', err);
        }

        res.status(200).json({
          isEnded: true,
          message: closingMessage,
          feedback,
        });
        return;
      }

      // 4. Interview is ongoing. Save the AI's response (question/follow-up) in the database
      await prisma.conversation.create({
        data: {
          sessionId,
          role: 'ASSISTANT',
          content: aiResponse,
        },
      });

      // Update session state in DB
      await prisma.interviewSession.update({
        where: { id: sessionId },
        data: {
          questionCount: resultState.questionCount,
          difficulty: resultState.difficulty,
        },
      });

      res.status(200).json({
        isEnded: false,
        message: aiResponse,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors[0].message });
        return;
      }
      if (GeminiService.isRateLimitError(error)) {
        res.status(429).json({ error: 'Gemini API is busy (rate limit exceeded). Please wait 10-15 seconds and speak your answer again.' });
        return;
      }
      next(error);
    } finally {
      SessionLockManager.release(sessionId);
    }
  }

  /**
   * Manually end the interview session and generate the feedback report immediately.
   */
  static async end(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const sessionId = req.params.id || req.body.sessionId;

    if (!sessionId) {
      res.status(400).json({ error: 'Session ID is required' });
      return;
    }

    if (!SessionLockManager.acquire(sessionId)) {
      res.status(429).json({ error: 'AI is currently generating your report... Please wait.' });
      return;
    }

    try {
      const session = await prisma.interviewSession.findUnique({
        where: { id: sessionId },
        include: {
          user: true,
          feedback: true,
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!session) {
        res.status(404).json({ error: 'Interview session not found' });
        return;
      }

      if (session.userId !== userId) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      // If already completed, return existing feedback
      if (session.status === 'COMPLETED' && session.feedback) {
        res.status(200).json({
          message: 'Interview already completed',
          feedback: session.feedback,
        });
        return;
      }

      // Map DB messages to LangGraph state
      const graphMessages = session.messages.map((msg) => ({
        role: msg.role === 'USER' ? ('user' as const) : ('assistant' as const),
        content: msg.content,
      }));

      // Force report generation by setting questionCount to maxQuestions in the state
      const currentState: InterviewState = {
        messages: graphMessages,
        jobRole: session.user.jobRole,
        experienceLevel: session.user.experienceLevel,
        candidateName: session.user.name,
        interviewType: session.type,
        questionCount: env.MAX_QUESTIONS_PER_SESSION, // forces report
        maxQuestions: env.MAX_QUESTIONS_PER_SESSION,
        difficulty: session.difficulty as 'EASY' | 'MEDIUM' | 'HARD',
      };

      const resultState = await LangGraphService.runInterview(currentState);
      const aiResponse = resultState.responseContent || '';

      let reportData;
      try {
        reportData = JSON.parse(aiResponse);
      } catch (e) {
        logger.error('Failed to parse AI report JSON during manual end:', aiResponse);
        throw new Error('Failed to generate a valid structured feedback report.');
      }

      // Save the feedback report in the database
      const feedback = await prisma.feedback.create({
        data: {
          sessionId,
          overallScore: reportData.overallScore,
          communicationScore: reportData.communicationScore,
          technicalScore: reportData.technicalScore,
          confidenceScore: reportData.confidenceScore,
          leadershipScore: reportData.leadershipScore,
          problemSolvingScore: reportData.problemSolvingScore,
          strengths: reportData.strengths,
          weaknesses: reportData.weaknesses,
          suggestions: reportData.suggestions,
          overallSummary: reportData.overallSummary,
        },
      });

      // Mark the session as COMPLETED
      await prisma.interviewSession.update({
        where: { id: sessionId },
        data: { status: 'COMPLETED' },
      });

      // Clean up LiveKit room
      await LiveKitService.deleteRoom(session.livekitRoom);

      res.status(200).json({
        message: 'Interview ended successfully',
        feedback,
      });
    } catch (error: any) {
      if (GeminiService.isRateLimitError(error)) {
        res.status(429).json({ error: 'Gemini API is busy. Please wait 15 seconds and click "End interview" again.' });
        return;
      }
      next(error);
    } finally {
      SessionLockManager.release(sessionId);
    }
  }

  /**
   * Get details of a specific interview session.
   */
  static async getSession(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      const sessionId = req.params.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const session = await prisma.interviewSession.findUnique({
        where: { id: sessionId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
          feedback: true,
        },
      });

      if (!session) {
        res.status(404).json({ error: 'Interview session not found' });
        return;
      }

      if (session.userId !== userId) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      res.status(200).json(session);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get dashboard stats for the logged-in candidate.
   */
  static async getStats(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const sessions = await prisma.interviewSession.findMany({
        where: {
          userId,
          status: 'COMPLETED',
        },
        include: {
          feedback: {
            select: {
              overallScore: true,
            },
          },
        },
      });

      const total = sessions.length;
      let avg = 0;
      let best = 0;

      if (total > 0) {
        const scores = sessions
          .map((s) => s.feedback?.overallScore)
          .filter((score): score is number => typeof score === 'number');

        if (scores.length > 0) {
          const sum = scores.reduce((a, b) => a + b, 0);
          avg = sum / scores.length;
          best = Math.max(...scores);
        }
      }

      res.status(200).json({ total, avg, best });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all past interview sessions for the logged-in candidate.
   */
  static async getHistory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

      const history = await prisma.interviewSession.findMany({
        where: {
          userId,
          status: 'COMPLETED',
          feedback: {
            isNot: null,
          },
        },
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          feedback: true,
          _count: {
            select: { messages: true },
          },
        },
      });

      res.status(200).json(history);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get feedback report for a completed session.
   */
  static async getReport(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      const sessionId = req.params.id; // Report is associated 1:1 with session ID

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const session = await prisma.interviewSession.findUnique({
        where: { id: sessionId },
        select: { 
          userId: true,
          type: true,
          messages: {
            orderBy: { createdAt: 'asc' },
          }
        },
      });

      if (!session) {
        res.status(404).json({ error: 'Interview session not found' });
        return;
      }

      if (session.userId !== userId) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      const feedback = await prisma.feedback.findUnique({
        where: { sessionId },
      });

      if (!feedback) {
        res.status(404).json({ error: 'Feedback report not generated yet' });
        return;
      }

      res.status(200).json({
        overall: feedback.overallScore,
        type: session.type,
        scores: {
          communication: feedback.communicationScore,
          technical: feedback.technicalScore,
          confidence: feedback.confidenceScore,
          leadership: feedback.leadershipScore,
          problemSolving: feedback.problemSolvingScore
        },
        strengths: feedback.strengths,
        weaknesses: feedback.weaknesses,
        suggestions: feedback.suggestions,
        overallSummary: feedback.overallSummary,
        transcript: session.messages.map((m) => ({
          role: m.role === 'USER' ? ('user' as const) : ('ai' as const),
          text: m.content,
        })),
      });
    } catch (error) {
      next(error);
    }
  }
}
