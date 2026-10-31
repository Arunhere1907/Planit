import { GoogleGenAI } from '@google/genai';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { CONSTANTS } from '../../config/constants.js';
import { cacheService } from '../cache.service.js';
import {
  buildSecurePrompt,
  sanitizeUserInput,
  MAX_OUTPUT_TOKENS,
  detectInjectionPatterns,
} from './prompt-security.js';

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
   * Generates structured text/JSON from Gemini with security hardening, caching, and timeout safeguard
   * 
   * Security measures:
   * - Separates system instructions from user data
   * - Sanitizes user input (removes secrets, control chars, injection patterns)
   * - Adds explicit anti-injection instructions
   * - Caps output tokens to prevent runaway costs
   * - Detects and logs potential injection attempts
   * 
   * Performance optimizations:
   * - Caches identical requests (5min TTL) to reduce API calls and costs
   * - Returns cached response immediately if available
   */
  public async generateContent(systemPrompt: string, userPrompt: string, useCache = true): Promise<string> {
    if (!this.client) {
      throw new Error('LLM client not configured or missing API key');
    }

    // Check cache first (skip for non-deterministic requests)
    if (useCache) {
      const cacheKey = cacheService.generateKey('llm', {
        system: systemPrompt.slice(0, 100), // Sample to keep key size reasonable
        user: userPrompt,
        model: this.modelName,
      });

      const cached = cacheService.get<string>(cacheKey);
      if (cached) {
        logger.info('LLM cache hit - skipping API call', {
          model: this.modelName,
          promptLength: userPrompt.length,
        });
        return cached;
      }
    }

    // Sanitize and detect injection attempts
    const sanitizedInput = sanitizeUserInput(userPrompt);
    const injectionCheck = detectInjectionPatterns(sanitizedInput);
    
    if (injectionCheck.detected) {
      logger.warn('Potential prompt injection detected', {
        patterns: injectionCheck.patterns,
        inputPreview: sanitizedInput.slice(0, 200),
      });
      // Continue but log the attempt - don't block to avoid false positives
    }

    // Build secure prompt with clear separation
    const { systemPrompt: secureSystem, userPrompt: secureUser } = buildSecurePrompt(
      systemPrompt,
      sanitizedInput
    );

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('LLM call timed out after 9000ms')), CONSTANTS.TIMEOUTS.LLM_TIMEOUT_MS);
    });

    const callPromise = (async () => {
      const startTime = Date.now();
      
      // Safe to use non-null assertion: client initialization is checked in constructor
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const response = await this.client!.models.generateContent({
        model: this.modelName,
        contents: [
          {
            role: 'user',
            parts: [{ text: `${secureSystem}\n\n${secureUser}` }]
          }
        ],
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
          maxOutputTokens: MAX_OUTPUT_TOKENS, // Cap output size
        }
      });

      const text = response.text;
      if (!text) {
        throw new Error('Empty response from LLM');
      }
      
      const duration = Date.now() - startTime;
      logger.info('LLM API call completed', {
        model: this.modelName,
        durationMs: duration,
        outputLength: text.length,
      });
      
      // Validate output doesn't contain secrets (defense in depth)
      const outputCheck = detectInjectionPatterns(text);
      if (outputCheck.detected) {
        logger.warn('LLM output contained suspicious patterns', {
          patterns: outputCheck.patterns,
        });
      }
      
      // Cache the result for future identical requests
      if (useCache) {
        const cacheKey = cacheService.generateKey('llm', {
          system: systemPrompt.slice(0, 100),
          user: userPrompt,
          model: this.modelName,
        });
        cacheService.set(cacheKey, text, 5 * 60 * 1000); // 5 minute TTL
      }
      
      return text;
    })();

    return Promise.race([callPromise, timeoutPromise]);
  }
}

export const llmClient = new LLMClient();
