import { GoogleGenAI } from '@google/genai';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { CONSTANTS } from '../../config/constants.js';

export class LLMClient {
  private client: GoogleGenAI | null = null;
  private readonly modelName = 'gemini-2.5-flash';

  constructor() {
    if (env.GEMINI_API_KEY && env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY') {
      try {
        this.client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
        logger.info('Gemini LLM Client initialized successfully');
      } catch (err) {
        logger.warn('Failed to initialize Gemini client, fallback mode enabled', { err });
        this.client = null;
      }
    } else {
      logger.info('No valid GEMINI_API_KEY configured. Running with intelligent deterministic fallback.');
    }
  }

  public isAvailable(): boolean {
    return this.client !== null;
  }

  /**
   * Generates structured text/JSON from Gemini with a timeout safeguard
   */
  public async generateContent(systemPrompt: string, userPrompt: string): Promise<string> {
    if (!this.client) {
      throw new Error('LLM client not configured or missing API key');
    }

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('LLM call timed out after 9000ms')), CONSTANTS.TIMEOUTS.LLM_TIMEOUT_MS);
    });

    const callPromise = (async () => {
      const response = await this.client!.models.generateContent({
        model: this.modelName,
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemPrompt}\n\nUSER REQUEST:\n${userPrompt}` }]
          }
        ],
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2
        }
      });

      const text = response.text;
      if (!text) {
        throw new Error('Empty response from LLM');
      }
      return text;
    })();

    return Promise.race([callPromise, timeoutPromise]);
  }
}

export const llmClient = new LLMClient();
