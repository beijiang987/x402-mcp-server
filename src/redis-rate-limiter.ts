/**
 * Redis-based Rate Limiting Service (Vercel KV)
 *
 * Persistent rate limiting that survives function restarts
 * Uses Vercel KV (Redis) for storage
 */

import { kv } from '@vercel/kv';
import { logger } from './utils/logger.js';

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

interface RateLimitRecord {
  count: number;
  resetTime: number;
  tier: 'free' | 'paid';
}

/**
 * Redis Rate Limiter Service
 */
export class RedisRateLimiterService {
  // Rate limits
  private readonly limits = {
    free: {
      requestsPerDay: 10,
      windowMs: 86400000, // 24 hours
    },
    paid: {
      requestsPerMinute: 60,
      windowMs: 60000, // 1 minute
    },
  };

  /**
   * Check if request is allowed
   */
  async checkLimit(
    identifier: string,
    tier: 'free' | 'paid' = 'free'
  ): Promise<RateLimitResult> {
    try {
      const now = Date.now();
      const key = `rate_limit:${identifier}`;

      // Try to get existing record
      const recordData = await kv.get<RateLimitRecord>(key);

      // No record exists - allow and create new record
      if (!recordData) {
        return await this.createNewRecord(key, tier, now);
      }

      // Check if window has expired
      if (now >= recordData.resetTime) {
        // Reset window
        return await this.createNewRecord(key, tier, now);
      }

      // Window still active - check limit
      const maxRequests =
        recordData.tier === 'free'
          ? this.limits.free.requestsPerDay
          : this.limits.paid.requestsPerMinute;

      if (recordData.count >= maxRequests) {
        // Rate limit exceeded
        logger.rateLimit(identifier, false, tier);
        return {
          allowed: false,
          remaining: 0,
          resetTime: recordData.resetTime,
        };
      }

      // Increment count
      const updatedRecord: RateLimitRecord = {
        ...recordData,
        count: recordData.count + 1,
      };

      // Calculate TTL (time until window expires + 1 hour buffer)
      const ttlSeconds = Math.ceil(
        (recordData.resetTime - now + 3600000) / 1000
      );

      await kv.set(key, updatedRecord, { ex: ttlSeconds });

      logger.rateLimit(identifier, true, tier);
      return {
        allowed: true,
        remaining: maxRequests - updatedRecord.count,
        resetTime: recordData.resetTime,
      };
    } catch (error: any) {
      logger.error('Redis rate limiter error, falling back to allow', error);
      // On error, allow the request (fail open for availability)
      return {
        allowed: true,
        remaining: 999,
        resetTime: Date.now() + 60000,
      };
    }
  }

  /**
   * Create new rate limit record
   */
  private async createNewRecord(
    key: string,
    tier: 'free' | 'paid',
    now: number
  ): Promise<RateLimitResult> {
    const limit = tier === 'free' ? this.limits.free : this.limits.paid;
    const resetTime = now + limit.windowMs;

    const record: RateLimitRecord = {
      count: 1,
      resetTime,
      tier,
    };

    // Calculate TTL (window duration + 1 hour buffer)
    const ttlSeconds = Math.ceil((limit.windowMs + 3600000) / 1000);

    await kv.set(key, record, { ex: ttlSeconds });

    const maxRequests =
      tier === 'free'
        ? this.limits.free.requestsPerDay
        : this.limits.paid.requestsPerMinute;

    logger.rateLimit(key, true, tier);
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime,
    };
  }

  /**
   * Get identifier from request
   * Uses IP address for free tier, transaction hash for paid tier
   */
  getIdentifier(req: any, txHash?: string): string {
    if (txHash) {
      // Paid tier - use transaction hash
      return `paid:${txHash}`;
    }

    // Free tier - use IP address
    const ip =
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.headers['x-real-ip'] ||
      req.connection?.remoteAddress ||
      'unknown';

    return `free:${ip}`;
  }

  /**
   * Reset limit for identifier (admin function)
   */
  async resetLimit(identifier: string): Promise<void> {
    try {
      const key = `rate_limit:${identifier}`;
      await kv.del(key);
      logger.info(`Rate limit reset for ${identifier}`);
    } catch (error: any) {
      logger.error('Failed to reset rate limit', error);
    }
  }

  /**
   * Get current usage stats for identifier
   */
  async getStats(identifier: string): Promise<RateLimitRecord | null> {
    try {
      const key = `rate_limit:${identifier}`;
      return await kv.get<RateLimitRecord>(key);
    } catch (error: any) {
      logger.error('Failed to get rate limit stats', error);
      return null;
    }
  }

  /**
   * Manually set rate limit (admin function)
   */
  async setLimit(
    identifier: string,
    count: number,
    resetTime: number,
    tier: 'free' | 'paid'
  ): Promise<void> {
    try {
      const key = `rate_limit:${identifier}`;
      const record: RateLimitRecord = { count, resetTime, tier };
      const ttlSeconds = Math.ceil((resetTime - Date.now() + 3600000) / 1000);
      await kv.set(key, record, { ex: Math.max(1, ttlSeconds) });
      logger.info(`Rate limit set for ${identifier}: ${count}/${tier}`);
    } catch (error: any) {
      logger.error('Failed to set rate limit', error);
    }
  }
}

// Export singleton instance
export const redisRateLimiter = new RedisRateLimiterService();
