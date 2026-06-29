import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env';
import { logger } from '../utils/logger';

// Initialize the Google Gen AI client
const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY || '');

const RETRY_DELAYS = [5000, 10000, 20000]; // 1st retry -> 5s, 2nd -> 10s, 3rd -> 20s
const REQUEST_TIMEOUT_MS = 25000; // 25 seconds timeout

export class GeminiService {
  private static primaryModel = 'gemini-2.5-flash';
  
  // Chain of fallback models to try if the primary or previous fallbacks fail
  private static fallbackModels = [
    'gemini-1.5-flash-latest',
    'gemini-1.5-flash',
    'gemini-1.5-pro-latest',
    'gemini-1.5-pro'
  ];

  /**
   * Helper to determine if an error is a transient Google API error (like 503 or 429).
   */
  public static isTransientError(error: any): boolean {
    const status = error?.status;
    const message = error?.message || '';
    return (
      status === 503 ||
      status === 429 ||
      message.includes('503') ||
      message.includes('429') ||
      message.includes('Service Unavailable') ||
      message.includes('resource exhausted') ||
      message.includes('Quota exceeded') ||
      message.includes('Gemini Request Timeout')
    );
  }

  /**
   * Helper to determine if an error is a Rate Limit (429) specifically.
   */
  public static isRateLimitError(error: any): boolean {
    const status = error?.status;
    const message = error?.message || '';
    return status === 429 || message.includes('429') || message.includes('Quota exceeded');
  }

  /**
   * Wraps a promise in a timeout.
   */
  private static withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Gemini Request Timeout')), timeoutMs)
      ),
    ]);
  }

  /**
   * Generates a text response from Gemini with automatic retries on transient errors,
   * request timeouts, and a multi-model fallback chain.
   */
  static async generateText(
    systemInstruction: string,
    history: { role: 'user' | 'model'; parts: { text: string }[] }[],
    prompt: string,
    attempt = 0
  ): Promise<string> {
    const startTime = Date.now();
    logger.info(`[Gemini] Gemini Request Started. Model: ${this.primaryModel}. Attempt: ${attempt + 1}`);

    try {
      const model = genAI.getGenerativeModel({
        model: this.primaryModel,
        systemInstruction,
      });

      const chat = model.startChat({
        history,
      });

      // Run with timeout
      const result = await this.withTimeout(chat.sendMessage(prompt), REQUEST_TIMEOUT_MS);
      const responseText = result.response.text();
      
      if (!responseText) {
        throw new Error('Empty response from Gemini');
      }

      const duration = Date.now() - startTime;
      logger.info(`[Gemini] Gemini Response Received. Duration: ${duration}ms. Attempt: ${attempt + 1}. Success. Interview Continued.`);
      return responseText.trim();
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.warn(`[Gemini] Gemini Request Failed after ${duration}ms. Error: ${error.message || error}`);

      // If it is a transient error (429/503/timeout) and we have retries left, retry after a delay
      if (this.isTransientError(error) && attempt < RETRY_DELAYS.length) {
        const delay = RETRY_DELAYS[attempt];
        logger.warn(`[Gemini] 429 Rate Limit / Timeout detected. Retry Attempt ${attempt + 1} (waiting ${delay / 1000}s)...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.generateText(systemInstruction, history, prompt, attempt + 1);
      }

      // If all retries failed, try the fallback chain
      logger.warn(`[Gemini] Primary model ${this.primaryModel} exhausted. Trying fallback chain...`);
      
      for (const fallbackModelName of this.fallbackModels) {
        try {
          logger.info(`[Gemini] 🔄 Trying fallback model: ${fallbackModelName} (forcing v1 API)`);
          const fallbackModel = genAI.getGenerativeModel({
            model: fallbackModelName,
            systemInstruction,
          }, {
            apiVersion: 'v1'
          });

          const chat = fallbackModel.startChat({
            history,
          });

          const result = await this.withTimeout(chat.sendMessage(prompt), REQUEST_TIMEOUT_MS);
          const responseText = result.response.text();
          if (responseText) {
            logger.info(`[Gemini] Fallback model ${fallbackModelName} succeeded. Interview Continued.`);
            return responseText.trim();
          }
        } catch (fallbackError: any) {
          logger.warn(`[Gemini] ⚠️ Fallback model ${fallbackModelName} failed: ${fallbackError.message || fallbackError}`);
        }
      }

      // If all retries and fallbacks fail, return the graceful fallback message
      logger.error(`[Gemini] 🔴 All primary and fallback Gemini models failed. Returning graceful fallback message.`);
      return "I'm experiencing a temporary delay while generating the next interview question. Please wait a few moments.";
    }
  }

  /**
   * Generates a structured JSON response from Gemini with automatic retries on transient errors,
   * request timeouts, and a multi-model fallback chain.
   */
  static async generateJSON<T>(
    systemInstruction: string,
    history: { role: 'user' | 'model'; parts: { text: string }[] }[],
    prompt: string,
    attempt = 0
  ): Promise<T> {
    const startTime = Date.now();
    logger.info(`[Gemini] Gemini JSON Request Started. Model: ${this.primaryModel}. Attempt: ${attempt + 1}`);

    try {
      const model = genAI.getGenerativeModel({
        model: this.primaryModel,
        systemInstruction,
        generationConfig: {
          responseMimeType: 'application/json',
        },
      });

      const chat = model.startChat({
        history,
      });

      // Run with timeout
      const result = await this.withTimeout(chat.sendMessage(prompt), REQUEST_TIMEOUT_MS);
      const responseText = result.response.text();

      if (!responseText) {
        throw new Error('Empty response from Gemini for JSON generation');
      }

      const duration = Date.now() - startTime;
      logger.info(`[Gemini] Gemini JSON Response Received. Duration: ${duration}ms. Attempt: ${attempt + 1}. Success. Interview Continued.`);
      return JSON.parse(responseText.trim()) as T;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.warn(`[Gemini] Gemini JSON Request Failed after ${duration}ms. Error: ${error.message || error}`);

      // If it is a transient error (429/503/timeout) and we have retries left, retry after a delay
      if (this.isTransientError(error) && attempt < RETRY_DELAYS.length) {
        const delay = RETRY_DELAYS[attempt];
        logger.warn(`[Gemini] 429 Rate Limit / Timeout detected during JSON gen. Retry Attempt ${attempt + 1} (waiting ${delay / 1000}s)...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.generateJSON<T>(systemInstruction, history, prompt, attempt + 1);
      }

      // If all retries failed, or it's a 429 rate limit, or it's a non-transient error, try the fallback chain
      logger.warn(`[Gemini] Primary model ${this.primaryModel} failed during JSON gen (Error: ${error.message || error}). Trying fallback chain...`);
      
      for (const fallbackModelName of this.fallbackModels) {
        try {
          logger.info(`[Gemini] 🔄 Trying fallback model for JSON gen: ${fallbackModelName} (forcing v1 API)`);
          const fallbackModel = genAI.getGenerativeModel({
            model: fallbackModelName,
            systemInstruction,
            generationConfig: {
              responseMimeType: 'application/json',
            },
          }, {
            apiVersion: 'v1'
          });

          const chat = fallbackModel.startChat({
            history,
          });

          const result = await this.withTimeout(chat.sendMessage(prompt), REQUEST_TIMEOUT_MS);
          const responseText = result.response.text();
          if (responseText) {
            logger.info(`[Gemini] Fallback model ${fallbackModelName} succeeded for JSON gen. Interview Continued.`);
            return JSON.parse(responseText.trim()) as T;
          }
        } catch (fallbackError: any) {
          logger.warn(`[Gemini] ⚠️ Fallback model ${fallbackModelName} failed during JSON gen: ${fallbackError.message || fallbackError}`);
        }
      }

      // If all retries and fallbacks fail, return a default mock JSON object based on the prompt type
      logger.error(`[Gemini] 🔴 All primary and fallback Gemini models failed for JSON gen. Returning default mock structure.`);
      
      const promptLower = prompt.toLowerCase();
      if (promptLower.includes('evaluation') || promptLower.includes('evaluate')) {
        return {
          communicationScore: 7,
          confidenceScore: 7,
          competenceScore: 7,
          leadershipScore: 7,
          problemSolvingScore: 7,
          rating: 'STANDARD',
          reason: 'Temporary AI delay. Standard score assumed to keep the session alive.',
        } as unknown as T;
      } else {
        // Default Report
        return {
          overallScore: 70,
          communicationScore: 70,
          technicalScore: 70,
          confidenceScore: 70,
          leadershipScore: 70,
          problemSolvingScore: 70,
          strengths: ['Clear response structure', 'Good fundamental knowledge'],
          weaknesses: ['Could elaborate more on scale and edge cases'],
          suggestions: ['Practice explaining distributed systems step-by-step'],
          overallSummary: 'The interview was completed, but some responses experienced AI processing delays. A standard evaluation has been generated.',
        } as unknown as T;
      }
    }
  }
}
