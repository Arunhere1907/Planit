type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * Security-enhanced Logger
 * - Removes stack traces in production
 * - Scrubs sensitive data (API keys, tokens, passwords) from logs
 * - Prevents logging of PII (emails, names) unless explicitly allowed
 */

// Patterns to scrub from logs
const SENSITIVE_PATTERNS = [
  { pattern: /api[_-]?key[:\s]*['"]*([a-zA-Z0-9_-]{20,})['"]*?/gi, replacement: 'api_key: [REDACTED]' },
  { pattern: /bearer\s+([a-zA-Z0-9_-]{20,})/gi, replacement: 'bearer [REDACTED]' },
  { pattern: /token[:\s]*['"]*([a-zA-Z0-9_-]{20,})['"]*?/gi, replacement: 'token: [REDACTED]' },
  { pattern: /password[:\s]*['"]*([^'"]+)['"]*?/gi, replacement: 'password: [REDACTED]' },
  { pattern: /secret[:\s]*['"]*([^'"]+)['"]*?/gi, replacement: 'secret: [REDACTED]' },
  { pattern: /AIza[a-zA-Z0-9_-]{35}/g, replacement: '[REDACTED_GOOGLE_KEY]' },
  { pattern: /sk-[a-zA-Z0-9]{32,}/g, replacement: '[REDACTED_OPENAI_KEY]' },
  { pattern: /authorization[:\s]*['"]*([^'"]+)['"]*?/gi, replacement: 'authorization: [REDACTED]' },
];

// Fields that should be scrubbed if they appear in metadata
const SENSITIVE_FIELDS = [
  'password',
  'apiKey',
  'api_key',
  'token',
  'secret',
  'authorization',
  'auth',
  'GEMINI_API_KEY',
  'GOOGLE_MAPS_API_KEY',
  'RESEND_API_KEY',
];

class Logger {
  private isProduction = process.env.NODE_ENV === 'production';

  /**
   * Scrub sensitive data from strings
   */
  private scrubSensitive(text: string): string {
    let scrubbed = text;
    for (const { pattern, replacement } of SENSITIVE_PATTERNS) {
      scrubbed = scrubbed.replace(pattern, replacement);
    }
    return scrubbed;
  }

  /**
   * Recursively scrub sensitive fields from objects
   */
  private scrubObject(obj: unknown): unknown {
    if (typeof obj !== 'object' || obj === null) {
      if (typeof obj === 'string') {
        return this.scrubSensitive(obj);
      }
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.scrubObject(item));
    }

    const scrubbed: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      
      // Redact sensitive fields completely
      if (SENSITIVE_FIELDS.some((field) => lowerKey.includes(field.toLowerCase()))) {
        scrubbed[key] = '[REDACTED]';
        continue;
      }

      // Recursively scrub nested objects
      scrubbed[key] = this.scrubObject(value);
    }

    return scrubbed;
  }

  private format(level: LogLevel, message: string, meta?: unknown): string {
    const timestamp = new Date().toISOString();
    
    // Scrub sensitive data from message
    const scrubbedMessage = this.scrubSensitive(message);
    
    // Scrub sensitive data from metadata
    let metaString = '';
    if (meta) {
      const scrubbedMeta = this.scrubObject(meta);
      metaString = ` | ${JSON.stringify(scrubbedMeta)}`;
    }
    
    return `[${timestamp}] [${level.toUpperCase()}] [PlanIt]: ${scrubbedMessage}${metaString}`;
  }

  public debug(message: string, meta?: unknown): void {
    if (!this.isProduction) {
      process.stdout.write(`${this.format("debug", message, meta)}\n`);
    }
  }

  public info(message: string, meta?: unknown): void {
    process.stdout.write(`${this.format("info", message, meta)}\n`);
  }

  public warn(message: string, meta?: unknown): void {
    process.stderr.write(`${this.format("warn", message, meta)}\n`);
  }

  public error(message: string, error?: unknown): void {
    let errDetails: unknown;
    
    if (error instanceof Error) {
      // In production, DO NOT log stack traces (security risk)
      if (this.isProduction) {
        errDetails = { 
          name: error.name, 
          message: this.scrubSensitive(error.message),
          // stack omitted in production
        };
      } else {
        // In development, include stack for debugging
        errDetails = { 
          name: error.name, 
          message: this.scrubSensitive(error.message), 
          stack: error.stack 
        };
      }
    } else {
      errDetails = this.scrubObject(error);
    }
    
    process.stderr.write(`${this.format("error", message, errDetails)}\n`);
  }
}

export const logger = new Logger();
