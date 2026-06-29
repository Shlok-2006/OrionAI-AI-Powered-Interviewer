import { StateGraph } from '@langchain/langgraph';
import { GeminiService } from './gemini.service';
import { GroqService } from './groq.service';
import { SYSTEM_PROMPTS, EVALUATION_PROMPT, REPORT_PROMPT } from '../prompts/interview.prompts';
import { logger } from '../utils/logger';

// Define the LangGraph State
export interface InterviewState {
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[];
  jobRole: string;
  experienceLevel: string;
  candidateName: string;
  interviewType: 'BEHAVIORAL' | 'TECHNICAL' | 'SYSTEM_DESIGN' | 'HR_CULTURE_FIT';
  questionCount: number;
  maxQuestions: number;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  lastEvaluation?: {
    communicationScore: number;
    confidenceScore: number;
    competenceScore: number;
    leadershipScore: number;
    problemSolvingScore: number;
    rating: 'WEAK' | 'STRONG' | 'STANDARD';
    reason: string;
  };
  nextAction?: 'INTRO' | 'FOLLOW_UP' | 'NEW_QUESTION' | 'REPORT';
  responseContent?: string;
}

// Helper to route text generation
async function generateText(systemInstruction: string, prompt: string, historyText = ''): Promise<string> {
  if (GroqService.isEnabled()) {
    return GroqService.generateText(systemInstruction, historyText, prompt);
  }
  return GeminiService.generateText(systemInstruction, [], historyText ? `${historyText}\n\n${prompt}` : prompt);
}

// Helper to route JSON generation
async function generateJSON<T>(systemInstruction: string, prompt: string, historyText = ''): Promise<T> {
  if (GroqService.isEnabled()) {
    return GroqService.generateJSON<T>(systemInstruction, historyText, prompt);
  }
  return GeminiService.generateJSON<T>(systemInstruction, [], historyText ? `${historyText}\n\n${prompt}` : prompt);
}

// Helper to format conversation history as a single text block
function formatConversationHistory(messages: { role: 'user' | 'assistant' | 'system'; content: string }[]): string {
  return messages
    .filter((m) => m.role !== 'system')
    .map((m) => `${m.role === 'assistant' ? 'Interviewer' : 'Candidate'}: ${m.content}`)
    .join('\n\n');
}

// Node 1: Generate Introduction
const generateIntroNode = async (state: InterviewState): Promise<Partial<InterviewState>> => {
  logger.info('Running Node: generate_intro');
  const systemPrompt = SYSTEM_PROMPTS[state.interviewType];
  const prompt = `You are starting the interview. 
1. Greet the candidate by their name, which is "${state.candidateName}".
2. Introduce yourself based on the interview type: "${state.interviewType}" (e.g., "Hi ${state.candidateName}, I am your Technical Interviewer today.").
3. Explain what the interview is about: it will evaluate them for the "${state.jobRole}" role at the "${state.experienceLevel}" level, focusing on the core aspects of a "${state.interviewType}" interview.
4. Give a kick-off by asking the very first question: ask them to briefly introduce themselves and share one of the best projects they have worked on.

CRITICAL:
- Do NOT use any placeholders like "[My Name]", "[Candidate Name]", or "[Interviewer Name]".
- Keep your entire introduction and question extremely natural, warm, and concise (around 3-4 sentences total).`;
  
  const response = await generateText(systemPrompt, prompt);
  
  return {
    responseContent: response,
    questionCount: 1,
    nextAction: 'NEW_QUESTION',
    messages: [{ role: 'assistant', content: response }],
  };
};

// Node 2: Evaluate Answer
const evaluateAnswerNode = async (state: InterviewState): Promise<Partial<InterviewState>> => {
  logger.info('Running Node: evaluate_answer');
  const systemPrompt = EVALUATION_PROMPT;
  
  const lastUserMessage = state.messages[state.messages.length - 1];
  if (!lastUserMessage || lastUserMessage.role !== 'user') {
    logger.warn('No user message to evaluate, skipping evaluation.');
    return {
      nextAction: 'NEW_QUESTION',
    };
  }

  // Format the history as text to prevent Gemini role-alternation errors
  const formattedHistory = formatConversationHistory(state.messages.slice(0, -1));
  const prompt = `Below is the conversation history of the interview so far:
---
${formattedHistory}
---

Candidate's latest answer: "${lastUserMessage.content}"

Evaluate the candidate's latest answer according to the evaluation criteria.`;

  const evaluation = await generateJSON<NonNullable<InterviewState['lastEvaluation']>>(
    systemPrompt,
    prompt,
    formattedHistory
  );

  logger.info(`Evaluation rating: ${evaluation.rating}, Reason: ${evaluation.reason}`);

  return {
    lastEvaluation: evaluation,
  };
};

// Node 3: Decide Next Step
const decideNextStepNode = (state: InterviewState): Partial<InterviewState> => {
  logger.info('Running Node: decide_next_step');
  
  if (state.questionCount >= state.maxQuestions) {
    logger.info('Max questions reached. Routing to REPORT.');
    return { nextAction: 'REPORT' };
  }

  const rating = state.lastEvaluation?.rating || 'STANDARD';
  
  if (rating === 'WEAK') {
    logger.info('Weak answer detected. Routing to FOLLOW_UP.');
    return { nextAction: 'FOLLOW_UP' };
  }
  
  if (rating === 'STRONG') {
    logger.info('Strong answer detected. Routing to INCREASE_DIFFICULTY.');
    return { nextAction: 'NEW_QUESTION', difficulty: state.difficulty === 'EASY' ? 'MEDIUM' : 'HARD' };
  }

  logger.info('Standard answer. Routing to NEW_QUESTION.');
  return { nextAction: 'NEW_QUESTION' };
};

// Node 4: Generate Follow-up
const generateFollowupNode = async (state: InterviewState): Promise<Partial<InterviewState>> => {
  logger.info('Running Node: generate_followup');
  const systemPrompt = SYSTEM_PROMPTS[state.interviewType];
  
  const formattedHistory = formatConversationHistory(state.messages);
  const prompt = `Below is the conversation history of the interview so far:
---
${formattedHistory}
---

The candidate's last response was evaluated as WEAK/VAGUE for the following reason: "${state.lastEvaluation?.reason || ''}".
Acknowledge their answer briefly and politely, then ask a targeted, supportive follow-up question to probe deeper and help them elaborate on the missing details (e.g., their specific actions, results, or technical implementation). Do not ask a completely new topic.`;

  const response = await generateText(systemPrompt, prompt, formattedHistory);

  return {
    responseContent: response,
    messages: [{ role: 'assistant', content: response }],
  };
};

// Node 5: Generate New Question
const generateQuestionNode = async (state: InterviewState): Promise<Partial<InterviewState>> => {
  logger.info(`Running Node: generate_question (Difficulty: ${state.difficulty})`);
  const systemPrompt = SYSTEM_PROMPTS[state.interviewType];
  
  const isStrong = state.lastEvaluation?.rating === 'STRONG';
  const formattedHistory = formatConversationHistory(state.messages);
  const prompt = `Below is the conversation history of the interview so far:
---
${formattedHistory}
---

Ask the next primary question for this ${state.interviewType} interview.
Job Role: ${state.jobRole}
Experience Level: ${state.experienceLevel}
Current Difficulty: ${state.difficulty}

${
  isStrong
    ? 'CRITICAL: The candidate gave a STRONG/EXCELLENT answer in the previous turn. Start your response by explicitly appreciating/praising their great answer (e.g., "Excellent point!", "That is a very solid approach!"), and then ask a more advanced, challenging question to test their depth.'
    : 'Ask a standard question matching the current difficulty.'
}

Make sure this question is dynamically generated based on the conversation context. Do NOT repeat topics already covered. Ask exactly ONE question.`;

  const response = await generateText(systemPrompt, prompt, formattedHistory);

  return {
    responseContent: response,
    questionCount: state.questionCount + 1,
    messages: [{ role: 'assistant', content: response }],
  };
};

// Node 6: Generate Final Report
const generateReportNode = async (state: InterviewState): Promise<Partial<InterviewState>> => {
  logger.info('Running Node: generate_report');
  const systemPrompt = REPORT_PROMPT;
  
  const formattedHistory = formatConversationHistory(state.messages);
  const prompt = `Below is the complete conversation history of the interview:
---
${formattedHistory}
---

The interview is now complete. Generate the final structured feedback report.`;

  const report = await generateJSON<any>(systemPrompt, prompt, formattedHistory);

  return {
    responseContent: JSON.stringify(report),
    nextAction: 'REPORT',
  };
};

// Entry Router Node
const routeEntryNode = (state: InterviewState): Partial<InterviewState> => {
  const hasUserMessages = state.messages.some((m) => m.role === 'user');
  if (!hasUserMessages) {
    return { nextAction: 'INTRO' };
  }
  return { nextAction: 'NEW_QUESTION' }; // Triggers evaluation for ongoing sessions
};

// Build the LangGraph using the channels configuration compatible with @langchain/langgraph v0.0.18
const finalGraph = new StateGraph<InterviewState>({
  channels: {
    messages: {
      value: (x: { role: 'user' | 'assistant' | 'system'; content: string }[], y: { role: 'user' | 'assistant' | 'system'; content: string }[]) => x.concat(y),
      default: () => [],
    },
    jobRole: {
      value: (x: string, y: string) => y ?? x,
      default: () => '',
    },
    experienceLevel: {
      value: (x: string, y: string) => y ?? x,
      default: () => '',
    },
    candidateName: {
      value: (x: string, y: string) => y ?? x,
      default: () => '',
    },
    interviewType: {
      value: (x: 'BEHAVIORAL' | 'TECHNICAL' | 'SYSTEM_DESIGN' | 'HR_CULTURE_FIT', y: 'BEHAVIORAL' | 'TECHNICAL' | 'SYSTEM_DESIGN' | 'HR_CULTURE_FIT') => y ?? x,
      default: () => 'BEHAVIORAL',
    },
    questionCount: {
      value: (x: number, y: number) => y ?? x,
      default: () => 0,
    },
    maxQuestions: {
      value: (x: number, y: number) => y ?? x,
      default: () => 5,
    },
    difficulty: {
      value: (x: 'EASY' | 'MEDIUM' | 'HARD', y: 'EASY' | 'MEDIUM' | 'HARD') => y ?? x,
      default: () => 'EASY',
    },
    lastEvaluation: {
      value: (x: any, y: any) => y ?? x,
      default: () => undefined,
    },
    nextAction: {
      value: (x: any, y: any) => y ?? x,
      default: () => undefined,
    },
    responseContent: {
      value: (x: string | undefined, y: string | undefined) => y ?? x,
      default: () => '',
    },
  },
})
  .addNode('entry_router', routeEntryNode as any)
  .addNode('generate_intro', generateIntroNode as any)
  .addNode('evaluate_answer', evaluateAnswerNode as any)
  .addNode('decide_next_step', decideNextStepNode as any)
  .addNode('generate_followup', generateFollowupNode as any)
  .addNode('generate_question', generateQuestionNode as any)
  .addNode('generate_report', generateReportNode as any);

finalGraph.setEntryPoint('entry_router' as any);

finalGraph.addConditionalEdges(
  'entry_router' as any,
  ((state: InterviewState) => (state.nextAction === 'INTRO' ? 'generate_intro' : 'evaluate_answer')) as any,
  {
    generate_intro: 'generate_intro',
    evaluate_answer: 'evaluate_answer',
  } as any
);

finalGraph.addEdge('generate_intro' as any, '__end__' as any);
finalGraph.addEdge('evaluate_answer' as any, 'decide_next_step' as any);

finalGraph.addConditionalEdges(
  'decide_next_step' as any,
  ((state: InterviewState) => state.nextAction || 'NEW_QUESTION') as any,
  {
    FOLLOW_UP: 'generate_followup',
    NEW_QUESTION: 'generate_question',
    REPORT: 'generate_report',
  } as any
);

finalGraph.addEdge('generate_followup' as any, '__end__' as any);
finalGraph.addEdge('generate_question' as any, '__end__' as any);
finalGraph.addEdge('generate_report' as any, '__end__' as any);

const compiledFinalGraph = finalGraph.compile();

export class LangGraphService {
  /**
   * Run the interview graph for a session.
   * Resolves the next state based on the conversation history.
   */
  static async runInterview(state: InterviewState): Promise<InterviewState> {
    try {
      return await compiledFinalGraph.invoke(state, {
        recursionLimit: 15,
      });
    } catch (error) {
      logger.error('Error running LangGraph:', error);
      throw error;
    }
  }
}
