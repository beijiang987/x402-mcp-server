/**
 * Rate Limiting Service
 *
 * Tracks request counts for free and paid tiers
 */

interface RateLimitRecord {
  count: number;
  resetTime: number;
  tier: 'free' | 'paid';
}

/**
 * Rate Limiter Service
 */
export class RateLimiterService {
  private records: Map<string, RateLimitRecord> = new Map();

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
  checkLimit(identifier: string, tier: 'free' | 'paid' = 'free'): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
  } {
    const now = Date.now();
    const record = this.records.get(identifier);

    // No record exists - allow and create new record
    if (!record) {
      const limit = tier === 'free' ? this.limits.free : this.limits.paid;
      const resetTime = now + limit.windowMs;

      this.records.set(identifier, {
        count: 1,
        resetTime,
        tier,
      });

      const maxRequests = tier === 'free'
        ? this.limits.free.requestsPerDay
        : this.limits.paid.requestsPerMinute;

      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime,
      };
    }

    // Check if window has expired
    if (now >= record.resetTime) {
      // Reset window
      const limit = tier === 'free' ? this.limits.free : this.limits.paid;
      const resetTime = now + limit.windowMs;

      this.records.set(identifier, {
        count: 1,
        resetTime,
        tier,
      });

      const maxRequests = tier === 'free'
        ? this.limits.free.requestsPerDay
        : this.limits.paid.requestsPerMinute;

      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime,
      };
    }

    // Window still active - check limit
    const maxRequests = record.tier === 'free'
      ? this.limits.free.requestsPerDay
      : this.limits.paid.requestsPerMinute;

    if (record.count >= maxRequests) {
      // Rate limit exceeded
      return {
        allowed: false,
        remaining: 0,
        resetTime: record.resetTime,
      };
    }

    // Increment count
    record.count++;
    this.records.set(identifier, record);

    return {
      allowed: true,
      remaining: maxRequests - record.count,
      resetTime: record.resetTime,
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
  resetLimit(identifier: string): void {
    this.records.delete(identifier);
  }

  /**
   * Clean up expired records
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.records.entries()) {
      if (now >= record.resetTime + 3600000) { // Keep for 1 hour after expiry
        this.records.delete(key);
      }
    }
  }

  /**
   * Start automatic cleanup (run every hour)
   */
  startAutoCleanup(): void {
    setInterval(() => {
      this.cleanup();
    }, 3600000); // 1 hour
  }
}

// Export singleton instance
export const rateLimiter = new RateLimiterService();

// Start auto cleanup
rateLimiter.startAutoCleanup();
