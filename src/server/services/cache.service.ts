/**
 * Simple in-memory cache with TTL for LLM and API responses
 * Reduces duplicate API calls and improves response times
 */

import { createHash } from 'crypto';
import { logger } from '../utils/logger.js';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class CacheService {
  private cache = new Map<string, CacheEntry<unknown>>();
  private readonly DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_ENTRIES = 500; // Cap memory usage

  /**
   * Generate cache key from prompt and params
   */
  public generateKey(prefix: string, data: Record<string, unknown>): string {
    const normalized = JSON.stringify(data, Object.keys(data).sort());
    const hash = createHash('sha256').update(normalized).digest('hex').slice(0, 16);
    return `${prefix}:${hash}`;
  }

  /**
   * Get cached value if not expired
   */
  public get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    logger.debug('Cache hit', { key });
    return entry.data;
  }

  /**
   * Set cache value with TTL
   */
  public set<T>(key: string, data: T, ttlMs?: number): void {
    // Enforce max cache size (LRU-style: delete oldest if over limit)
    if (this.cache.size >= this.MAX_ENTRIES) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    const entry: CacheEntry<T> = {
      data,
      expiresAt: Date.now() + (ttlMs || this.DEFAULT_TTL_MS),
    };

    this.cache.set(key, entry as CacheEntry<unknown>);
    logger.debug('Cache set', { key, ttlMs: ttlMs || this.DEFAULT_TTL_MS });
  }

  /**
   * Clear all cache entries (useful for testing or manual refresh)
   */
  public clear(): void {
    this.cache.clear();
    logger.info('Cache cleared');
  }

  /**
   * Get cache statistics
   */
  public getStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.MAX_ENTRIES,
    };
  }

  /**
   * Periodic cleanup of expired entries (optional optimization)
   */
  public cleanup(): void {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      logger.debug('Cache cleanup complete', { removed, remaining: this.cache.size });
    }
  }
}

export const cacheService = new CacheService();

// Optional: Run cleanup every 10 minutes to prevent memory bloat
setInterval(() => cacheService.cleanup(), 10 * 60 * 1000);
