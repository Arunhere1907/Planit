import { Request, Response, NextFunction } from 'express';
import { CONSTANTS } from '../config/constants.js';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const windowMap = new Map<string, RateLimitEntry>();

// Periodic cleanup every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of windowMap.entries()) {
    if (now > entry.resetAt) {
      windowMap.delete(key);
    }
  }
}, 300000).unref();

/**
 * In-memory sliding window rate limiter
 */
export function inMemoryRateLimiter(
  maxRequests: number = CONSTANTS.RATE_LIMITS.DEFAULT_WINDOW_MAX,
  windowMs: number = CONSTANTS.RATE_LIMITS.WINDOW_MS
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Demo environment bypass for testing/automated requests
    if (process.env.NODE_ENV === 'test') {
      return next();
    }

    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${ip}:${req.baseUrl || req.path}`;
    const now = Date.now();

    const current = windowMap.get(key);
    if (!current || now > current.resetAt) {
      windowMap.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    current.count += 1;
    if (current.count > maxRequests) {
      const retryAfterSeconds = Math.ceil((current.resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds);
      res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Too many requests. Please try again after ${retryAfterSeconds} seconds.`,
          retryAfter: retryAfterSeconds
        }
      });
      return;
    }

    next();
  };
}
