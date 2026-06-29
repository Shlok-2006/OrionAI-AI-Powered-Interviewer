import { env } from '../config/env';
import { logger } from '../utils/logger';

export class GroqService {
  private static modelName = 'llama-3.3-70b-versatile';

  /**
   * Checks if the Groq API is configured and enabled.
   */
  static isEnabled(): boolean {
    return !!env.GROQ_API_KEY;
  }

  /**
   * Generates a text response from Groq.
   */
  static async generateText(
    systemInstruction: string,
    historyText: string,
    prompt: string
  ): Promise<string> {
    if (!env.GROQ_API_KEY) {
      throw new Error('Groq API Key is not configured in environment variables.');
    }

    const startTime = Date.now();
    logger.info(`[Groq] Request Started. Model: ${this.modelName}`);

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.modelName,
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: historyText ? `${historyText}\n\n${prompt}` : prompt }
          ],
          temperature: 0.7,
          max_tokens: 512,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Groq API error: ${response.status} - ${errText}`);
      }

      const data = (await response.json()) as any;
      const text = data.choices?.[0]?.message?.content || '';
      const duration = Date.now() - startTime;
      logger.info(`[Groq] Response Received. Duration: ${duration}ms. Success.`);
      return text.trim();
    } catch (error) {
      logger.error('[Groq] Request Failed:', error);
      throw error;
    }
  }

  /**
   * Generates a structured JSON response from Groq.
   */
  static async generateJSON<T>(
    systemInstruction: string,
    historyText: string,
    prompt: string
  ): Promise<T> {
    if (!env.GROQ_API_KEY) {
      throw new Error('Groq API Key is not configured in environment variables.');
    }

    const startTime = Date.now();
    logger.info(`[Groq] JSON Request Started. Model: ${this.modelName}`);

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.modelName,
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: historyText ? `${historyText}\n\n${prompt}` : prompt }
          ],
          temperature: 0.2,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Groq API JSON error: ${response.status} - ${errText}`);
      }

      const data = (await response.json()) as any;
      const text = data.choices?.[0]?.message?.content || '{}';
      const duration = Date.now() - startTime;
      logger.info(`[Groq] JSON Response Received. Duration: ${duration}ms. Success.`);
      return JSON.parse(text.trim()) as T;
    } catch (error) {
      logger.error('[Groq] JSON Request Failed:', error);
      throw error;
    }
  }
}
