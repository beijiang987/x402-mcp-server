/**
 * Advanced Cache Management System
 *
 * Features:
 * - Multiple TTL strategies
 * - LRU eviction
 * - Statistics tracking
 * - Memory-efficient storage
 */

import { logger } from './logger.js';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
  size: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  evictions: number;
  hitRate: number;
  totalSize: number;
  entryCount: number;
}

export class CacheManager<T = any> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private stats: Omit<CacheStats, 'hitRate' | 'totalSize' | 'entryCount'> = {
    hits: 0,
    misses: 0,
    sets: 0,
    evictions: 0,
  };

  private maxSize: number;
  private maxEntries: number;
  private defaultTTL: number;

  constructor(options: {
    maxSize?: number; // in bytes
    maxEntries?: number;
    defaultTTL?: number; // in milliseconds
  } = {}) {
    this.maxSize = options.maxSize || 50 * 1024 * 1024; // 50MB default
    this.maxEntries = options.maxEntries || 1000;
    this.defaultTTL = options.defaultTTL || 60000; // 1 minute default
  }

  /**
   * Get value from cache
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      logger.cache('miss', key);
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      logger.cache('miss', key);
      return null;
    }

    // Update hit count
    entry.hits++;
    this.stats.hits++;
    logger.cache('hit', key);

    return entry.data;
  }

  /**
   * Set value in cache
   */
  set(key: string, data: T, ttl: number = this.defaultTTL): void {
    const size = this.estimateSize(data);

    // Check if we need to evict entries
    while (this.needsEviction(size)) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      hits: 0,
      size,
    };

    this.cache.set(key, entry);
    this.stats.sets++;
    logger.cache('set', key);
  }

  /**
   * Delete value from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Check if cache has key
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0,
    };
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalSize = Array.from(this.cache.values()).reduce(
      (sum, entry) => sum + entry.size,
      0
    );

    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;

    return {
      ...this.stats,
      hitRate: Math.round(hitRate * 100) / 100,
      totalSize,
      entryCount: this.cache.size,
    };
  }

  /**
   * Cleanup expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Start automatic cleanup interval
   */
  startAutoCleanup(intervalMs: number = 60000): void {
    setInterval(() => {
      const cleaned = this.cleanup();
      if (cleaned > 0) {
        logger.debug(`Cache cleanup: removed ${cleaned} expired entries`);
      }
    }, intervalMs);
  }

  /**
   * Estimate size of data in bytes
   */
  private estimateSize(data: any): number {
    try {
      const str = JSON.stringify(data);
      return str.length * 2; // UTF-16 characters are 2 bytes
    } catch {
      return 1024; // Default estimate if serialization fails
    }
  }

  /**
   * Check if eviction is needed
   */
  private needsEviction(newSize: number): boolean {
    if (this.cache.size >= this.maxEntries) {
      return true;
    }

    const currentSize = Array.from(this.cache.values()).reduce(
      (sum, entry) => sum + entry.size,
      0
    );

    return currentSize + newSize > this.maxSize;
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruScore = Infinity;

    // Find entry with lowest score (hits / age)
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.timestamp;
      const score = entry.hits / (age + 1); // +1 to avoid division by zero

      if (score < lruScore) {
        lruScore = score;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
      this.stats.evictions++;
      logger.debug(`Cache eviction: ${lruKey}`);
    }
  }
}

// Export default cache instance with optimized settings
export const defaultCache = new CacheManager({
  maxSize: 50 * 1024 * 1024, // 50MB
  maxEntries: 1000,
  defaultTTL: 30000, // 30 seconds
});

// Start auto cleanup
defaultCache.startAutoCleanup();
