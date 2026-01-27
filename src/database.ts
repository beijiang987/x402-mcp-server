/**
 * Postgres Database Access Layer
 *
 * Handles all database operations for:
 * - Payment records
 * - API call statistics
 * - Rate limit events
 * - Data source monitoring
 */

import { sql } from '@vercel/postgres';
import { logger } from './utils/logger.js';
import crypto from 'crypto';

// ============================================
// Types
// ============================================

export interface Payment {
  id?: number;
  txHash: string;
  chain: string;
  payerAddress: string;
  amountUsd: number;
  tokenAddress: string;
  tokenSymbol: string;
  endpoint: string;
  expectedPriceUsd: number;
  verified: boolean;
  verifiedAt?: Date;
  blockNumber?: number;
  createdAt?: Date;
}

export interface ApiCall {
  id?: number;
  endpoint: string;
  tier: 'free' | 'paid';
  success: boolean;
  responseTimeMs: number;
  ipHash?: string;
  txHash?: string;
  errorMessage?: string;
  userAgent?: string;
  createdAt?: Date;
}

export interface RateLimitEvent {
  id?: number;
  identifier: string;
  tier: 'free' | 'paid';
  endpoint: string;
  blocked: boolean;
  requestsCount: number;
  resetTime: Date;
  createdAt?: Date;
}

export interface DataSourceCall {
  id?: number;
  source: string;
  operation: string;
  success: boolean;
  durationMs: number;
  cacheHit: boolean;
  errorMessage?: string;
  createdAt?: Date;
}

export interface DailyRevenue {
  date: string;
  totalPayments: number;
  totalRevenueUsd: number;
  uniquePayers: number;
  avgPaymentUsd: number;
}

export interface EndpointStats {
  endpoint: string;
  totalCalls: number;
  successfulCalls: number;
  paidCalls: number;
  freeCalls: number;
  avgResponseMs: number;
  uniqueUsers: number;
}

export interface RealtimeStats {
  totalCalls24h: number;
  paidCalls24h: number;
  freeCalls24h: number;
  uniqueIps24h: number;
  avgResponseTime24h: number;
  successRate24h: number;
}

// ============================================
// Database Service Class
// ============================================

export class DatabaseService {
  /**
   * Hash IP address for privacy
   */
  private hashIp(ip: string): string {
    return crypto.createHash('sha256').update(ip + process.env.IP_SALT || 'x402').digest('hex');
  }

  // ========== Payment Records ==========

  /**
   * Record a new payment
   */
  async recordPayment(payment: Payment): Promise<number> {
    try {
      const result = await sql`
        INSERT INTO payments (
          tx_hash, chain, payer_address, amount_usd, token_address,
          token_symbol, endpoint, expected_price_usd, verified, verified_at, block_number
        ) VALUES (
          ${payment.txHash}, ${payment.chain}, ${payment.payerAddress},
          ${payment.amountUsd}, ${payment.tokenAddress}, ${payment.tokenSymbol},
          ${payment.endpoint}, ${payment.expectedPriceUsd}, ${payment.verified},
          ${payment.verifiedAt || null}, ${payment.blockNumber || null}
        )
        ON CONFLICT (tx_hash) DO NOTHING
        RETURNING id
      `;

      const id = result.rows[0]?.id;
      logger.payment('recorded', payment.txHash, payment.amountUsd.toString(), !!id);
      return id || 0;
    } catch (error: any) {
      logger.error('Failed to record payment', error);
      return 0;
    }
  }

  /**
   * Get payment by transaction hash
   */
  async getPayment(txHash: string): Promise<Payment | null> {
    try {
      const result = await sql`
        SELECT * FROM payments WHERE tx_hash = ${txHash}
      `;

      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return {
        id: row.id,
        txHash: row.tx_hash,
        chain: row.chain,
        payerAddress: row.payer_address,
        amountUsd: parseFloat(row.amount_usd),
        tokenAddress: row.token_address,
        tokenSymbol: row.token_symbol,
        endpoint: row.endpoint,
        expectedPriceUsd: parseFloat(row.expected_price_usd),
        verified: row.verified,
        verifiedAt: row.verified_at,
        blockNumber: row.block_number,
        createdAt: row.created_at,
      };
    } catch (error: any) {
      logger.error('Failed to get payment', error);
      return null;
    }
  }

  /**
   * Get daily revenue statistics
   */
  async getDailyRevenue(days: number = 30): Promise<DailyRevenue[]> {
    try {
      const result = await sql`
        SELECT * FROM daily_revenue
        LIMIT ${days}
      `;

      return result.rows.map(row => ({
        date: row.date,
        totalPayments: parseInt(row.total_payments),
        totalRevenueUsd: parseFloat(row.total_revenue_usd),
        uniquePayers: parseInt(row.unique_payers),
        avgPaymentUsd: parseFloat(row.avg_payment_usd),
      }));
    } catch (error: any) {
      logger.error('Failed to get daily revenue', error);
      return [];
    }
  }

  // ========== API Call Statistics ==========

  /**
   * Record an API call
   */
  async recordApiCall(call: ApiCall, req?: any): Promise<number> {
    try {
      // Hash IP for privacy
      const ipHash = req ? this.hashIp(
        req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.headers['x-real-ip'] ||
        req.connection?.remoteAddress ||
        'unknown'
      ) : null;

      const result = await sql`
        INSERT INTO api_calls (
          endpoint, tier, success, response_time_ms, ip_hash,
          tx_hash, error_message, user_agent
        ) VALUES (
          ${call.endpoint}, ${call.tier}, ${call.success},
          ${call.responseTimeMs}, ${ipHash}, ${call.txHash || null},
          ${call.errorMessage || null}, ${call.userAgent || null}
        )
        RETURNING id
      `;

      return result.rows[0]?.id || 0;
    } catch (error: any) {
      logger.error('Failed to record API call', error);
      return 0;
    }
  }

  /**
   * Get endpoint statistics
   */
  async getEndpointStats(): Promise<EndpointStats[]> {
    try {
      const result = await sql`
        SELECT * FROM endpoint_stats
      `;

      return result.rows.map(row => ({
        endpoint: row.endpoint,
        totalCalls: parseInt(row.total_calls),
        successfulCalls: parseInt(row.successful_calls),
        paidCalls: parseInt(row.paid_calls),
        freeCalls: parseInt(row.free_calls),
        avgResponseMs: parseFloat(row.avg_response_ms) || 0,
        uniqueUsers: parseInt(row.unique_users),
      }));
    } catch (error: any) {
      logger.error('Failed to get endpoint stats', error);
      return [];
    }
  }

  /**
   * Get realtime statistics (last 24 hours)
   */
  async getRealtimeStats(): Promise<RealtimeStats> {
    try {
      const result = await sql`
        SELECT * FROM realtime_stats
      `;

      const row = result.rows[0] || {};
      return {
        totalCalls24h: parseInt(row.total_calls_24h) || 0,
        paidCalls24h: parseInt(row.paid_calls_24h) || 0,
        freeCalls24h: parseInt(row.free_calls_24h) || 0,
        uniqueIps24h: parseInt(row.unique_ips_24h) || 0,
        avgResponseTime24h: parseFloat(row.avg_response_time_24h) || 0,
        successRate24h: parseFloat(row.success_rate_24h) || 0,
      };
    } catch (error: any) {
      logger.error('Failed to get realtime stats', error);
      return {
        totalCalls24h: 0,
        paidCalls24h: 0,
        freeCalls24h: 0,
        uniqueIps24h: 0,
        avgResponseTime24h: 0,
        successRate24h: 0,
      };
    }
  }

  /**
   * Get hourly request counts (last 24 hours)
   */
  async getHourlyRequests(): Promise<{ hour: string; requestCount: number }[]> {
    try {
      const result = await sql`
        SELECT * FROM get_hourly_requests()
      `;

      return result.rows.map(row => ({
        hour: new Date(row.hour).toISOString(),
        requestCount: parseInt(row.request_count),
      }));
    } catch (error: any) {
      logger.error('Failed to get hourly requests', error);
      return [];
    }
  }

  // ========== Rate Limit Events ==========

  /**
   * Record a rate limit event
   */
  async recordRateLimitEvent(event: RateLimitEvent): Promise<number> {
    try {
      const result = await sql`
        INSERT INTO rate_limit_events (
          identifier, tier, endpoint, blocked, requests_count, reset_time
        ) VALUES (
          ${event.identifier}, ${event.tier}, ${event.endpoint},
          ${event.blocked}, ${event.requestsCount}, ${event.resetTime}
        )
        RETURNING id
      `;

      return result.rows[0]?.id || 0;
    } catch (error: any) {
      logger.error('Failed to record rate limit event', error);
      return 0;
    }
  }

  // ========== Data Source Monitoring ==========

  /**
   * Record a data source call
   */
  async recordDataSourceCall(call: DataSourceCall): Promise<number> {
    try {
      const result = await sql`
        INSERT INTO data_source_calls (
          source, operation, success, duration_ms, cache_hit, error_message
        ) VALUES (
          ${call.source}, ${call.operation}, ${call.success},
          ${call.durationMs}, ${call.cacheHit}, ${call.errorMessage || null}
        )
        RETURNING id
      `;

      logger.dataSource(call.source, call.operation, call.success, call.durationMs);
      return result.rows[0]?.id || 0;
    } catch (error: any) {
      logger.error('Failed to record data source call', error);
      return 0;
    }
  }

  /**
   * Get top payers
   */
  async getTopPayers(limit: number = 10): Promise<any[]> {
    try {
      const result = await sql`
        SELECT * FROM top_payers LIMIT ${limit}
      `;

      return result.rows.map(row => ({
        payerAddress: row.payer_address,
        totalPayments: parseInt(row.total_payments),
        totalSpentUsd: parseFloat(row.total_spent_usd),
        firstPayment: row.first_payment,
        lastPayment: row.last_payment,
      }));
    } catch (error: any) {
      logger.error('Failed to get top payers', error);
      return [];
    }
  }
}

// Export singleton instance
export const db = new DatabaseService();
