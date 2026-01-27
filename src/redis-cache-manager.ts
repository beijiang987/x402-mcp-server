/**
 * Redis-based Cache Management System (Vercel KV)
 *
 * Features:
 * - Persistent across function restarts
 * - Automatic TTL expiration
 * - Statistics tracking
 * - Shared across all function instances
 */

import { kv } from '@vercel/kv';
import { logger } from './utils/logger.js';

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
}

export class RedisCacheManager<T = any> {
  private prefix: string;
  private defaultTTL: number;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
  };

  constructor(options: {
    prefix?: string;
    defaultTTL?: number; // in seconds
  } = {}) {
    this.prefix = options.prefix || 'cache';
    this.defaultTTL = options.defaultTTL || 60; // 1 minute default
  }

  /**
   * Get value from cache
   */
  async get(key: string): Promise<T | null> {
    try {
      const fullKey = `${this.prefix}:${key}`;
      const data = await kv.get<T>(fullKey);

      if (data === null) {
        this.stats.misses++;
        logger.cache('miss', key);
        return null;
      }

      this.stats.hits++;
      logger.cache('hit', key);
      return data;
    } catch (error: any) {
      logger.error('Redis cache get error', error);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Set value in cache with TTL
   */
  async set(key: string, data: T, ttlSeconds: number = this.defaultTTL): Promise<void> {
    try {
      const fullKey = `${this.prefix}:${key}`;
      await kv.set(fullKey, data, { ex: ttlSeconds });
      this.stats.sets++;
      logger.cache('set', key);
    } catch (error: any) {
      logger.error('Redis cache set error', error);
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<boolean> {
    try {
      const fullKey = `${this.prefix}:${key}`;
      const result = await kv.del(fullKey);
      return result > 0;
    } catch (error: any) {
      logger.error('Redis cache delete error', error);
      return false;
    }
  }

  /**
   * Check if cache has key
   */
  async has(key: string): Promise<boolean> {
    try {
      const fullKey = `${this.prefix}:${key}`;
      const exists = await kv.exists(fullKey);
      return exists > 0;
    } catch (error: any) {
      logger.error('Redis cache exists error', error);
      return false;
    }
  }

  /**
   * Get multiple values at once
   */
  async getMany(keys: string[]): Promise<Map<string, T>> {
    const results = new Map<string, T>();

    try {
      const fullKeys = keys.map((k) => `${this.prefix}:${k}`);
      const values = await kv.mget<T[]>(...fullKeys);

      keys.forEach((key, index) => {
        const value = values[index];
        if (value !== null) {
          results.set(key, value);
          this.stats.hits++;
        } else {
          this.stats.misses++;
        }
      });
    } catch (error: any) {
      logger.error('Redis cache getMany error', error);
    }

    return results;
  }

  /**
   * Set multiple values at once
   */
  async setMany(entries: Array<{ key: string; data: T; ttl?: number }>): Promise<void> {
    try {
      // Redis doesn't support multi-key operations with different TTLs easily
      // So we'll do them sequentially (could be optimized with pipeline)
      for (const entry of entries) {
        await this.set(entry.key, entry.data, entry.ttl);
      }
    } catch (error: any) {
      logger.error('Redis cache setMany error', error);
    }
  }

  /**
   * Get or set pattern: if cache miss, compute and store
   * Uses distributed locking to prevent race conditions
   */
  async getOrSet(
    key: string,
    computeFn: () => Promise<T>,
    ttlSeconds: number = this.defaultTTL
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }

    // Cache miss - try to acquire lock
    const lockKey = `${this.prefix}:lock:${key}`;
    const lockValue = `${Date.now()}-${Math.random()}`;
    const lockTTL = 10; // Lock expires after 10 seconds

    try {
      // Try to acquire lock using SET NX (atomic operation)
      const lockAcquired = await kv.set(lockKey, lockValue, {
        ex: lockTTL,
        nx: true, // Only set if key doesn't exist
      });

      if (!lockAcquired) {
        // Failed to acquire lock - another request is computing
        // Wait for the other request to complete
        logger.debug('Waiting for cache computation', { key });
        const result = await this.waitForCache(key, 8000); // Wait up to 8 seconds
        if (result !== null) {
          return result;
        }
        // Timeout or failed - compute anyway as fallback
        logger.warn('Cache wait timeout, computing anyway', { key });
      }

      // Lock acquired or timeout - compute value
      try {
        const computed = await computeFn();
        await this.set(key, computed, ttlSeconds);
        return computed;
      } finally {
        // Release lock (only if we still own it)
        try {
          const currentLock = await kv.get(lockKey);
          if (currentLock === lockValue) {
            await kv.del(lockKey);
          }
        } catch (error) {
          // Ignore lock release errors
        }
      }
    } catch (error: any) {
      logger.error('Redis cache getOrSet error', error);
      // On error, try to compute without lock
      const computed = await computeFn();
      return computed;
    }
  }

  /**
   * Wait for cache value to become available
   * Polls every 100ms for up to timeoutMs
   */
  private async waitForCache(key: string, timeoutMs: number): Promise<T | null> {
    const startTime = Date.now();
    const pollInterval = 100; // Check every 100ms

    while (Date.now() - startTime < timeoutMs) {
      const value = await this.get(key);
      if (value !== null) {
        logger.debug('Cache value available after wait', {
          key,
          waitTime: Date.now() - startTime,
        });
        return value;
      }
      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    return null;
  }

  /**
   * Increment a counter (atomic operation)
   */
  async increment(key: string, delta: number = 1): Promise<number> {
    try {
      const fullKey = `${this.prefix}:${key}`;
      return await kv.incrby(fullKey, delta);
    } catch (error: any) {
      logger.error('Redis cache increment error', error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats & { hitRate: number } {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;

    return {
      ...this.stats,
      hitRate: Math.round(hitRate * 100) / 100,
    };
  }

  /**
   * Clear all keys with this prefix (use with caution!)
   */
  async clearAll(): Promise<void> {
    try {
      // Note: Vercel KV doesn't support pattern matching deletion
      // This is a limitation we'll document
      logger.warn('Redis clearAll is not fully supported - manual cleanup needed');
    } catch (error: any) {
      logger.error('Redis cache clearAll error', error);
    }
  }

  /**
   * Set expiration time for existing key
   */
  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    try {
      const fullKey = `${this.prefix}:${key}`;
      return await kv.expire(fullKey, ttlSeconds);
    } catch (error: any) {
      logger.error('Redis cache expire error', error);
      return false;
    }
  }
}

// Export default cache instances for different use cases
export const tokenPriceCache = new RedisCacheManager<any>({
  prefix: 'cache:token_price',
  defaultTTL: 30, // 30 seconds
});

export const poolAnalyticsCache = new RedisCacheManager<any>({
  prefix: 'cache:pool_analytics',
  defaultTTL: 60, // 1 minute
});

export const contractSafetyCache = new RedisCacheManager<any>({
  prefix: 'cache:contract_safety',
  defaultTTL: 300, // 5 minutes (safety data changes slowly)
});

export const multichainPriceCache = new RedisCacheManager<any>({
  prefix: 'cache:multichain_price',
  defaultTTL: 30, // 30 seconds
});

export const whaleTransactionCache = new RedisCacheManager<any>({
  prefix: 'cache:whale_tx',
  defaultTTL: 120, // 2 minutes
});
