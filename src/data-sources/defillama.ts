/**
 * DeFiLlama API Data Source
 *
 * Free, unlimited queries
 * No API key required
 * Documentation: https://defillama.com/docs/api
 */

import { httpClient } from '../utils/http-client.js';

interface PoolData {
  pool_address: string;
  chain: string;
  project: string;
  symbol: string;
  tvl_usd: number;
  apy: number;
  apy_base: number;
  apy_reward: number;
  volume_usd_1d: number;
  volume_usd_7d: number;
  il_risk: string;
  underlying_tokens: string[];
}

interface TokenData {
  decimals: number;
  symbol: string;
  price: number;
  timestamp: number;
  confidence: number;
}

/**
 * DeFiLlama Data Source for Pool Analytics
 */
export class DeFiLlamaDataSource {
  private baseUrl = 'https://yields.llama.fi';
  private coinsUrl = 'https://coins.llama.fi';
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTTL = 60000; // 1 minute

  /**
   * Get pool analytics by address
   */
  async getPoolAnalytics(poolAddress: string, chain: string): Promise<any> {
    const cacheKey = `pool:${chain}:${poolAddress}`;

    // Check cache
    const cached = this.getFromCache<any>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Fetch all pools for the chain
      const data = await httpClient.get(`${this.baseUrl}/pools`, { timeout: 10000 });

      // Find the specific pool
      const normalizedAddress = poolAddress.toLowerCase();
      const pool = data.data.find((p: any) =>
        p.pool?.toLowerCase() === normalizedAddress ||
        p.poolMeta?.toLowerCase() === normalizedAddress
      );

      if (!pool) {
        throw new Error(`Pool not found: ${poolAddress} on ${chain}`);
      }

      const result = {
        pool_address: poolAddress,
        chain: pool.chain || chain,
        project: pool.project || 'Unknown',
        symbol: pool.symbol || '',
        tvl_usd: pool.tvlUsd || 0,
        apy: pool.apy || 0,
        apy_base: pool.apyBase || 0,
        apy_reward: pool.apyReward || 0,
        volume_usd_1d: pool.volumeUsd1d || 0,
        volume_usd_7d: pool.volumeUsd7d || 0,
        il_risk: pool.ilRisk || 'unknown',
        underlying_tokens: pool.underlyingTokens || [],
        last_updated: Date.now()
      };

      // Cache result
      this.setCache(cacheKey, result);

      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get token price from DeFiLlama
   */
  async getTokenPrice(tokenAddress: string, chain: string): Promise<number> {
    const cacheKey = `price:${chain}:${tokenAddress}`;

    // Check cache
    const cached = this.getFromCache<number>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // DeFiLlama uses chain:address format
      const chainPrefix = this.mapChainToPrefix(chain);
      const tokenId = `${chainPrefix}:${tokenAddress}`;

      const data = await httpClient.get(`${this.coinsUrl}/prices/current/${tokenId}`, { timeout: 8000 });
      const priceData = data.coins?.[tokenId];

      if (!priceData) {
        throw new Error(`Token price not found: ${tokenAddress} on ${chain}`);
      }

      const price = priceData.price || 0;

      // Cache result
      this.setCache(cacheKey, price);

      return price;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get current TVL for a protocol
   */
  async getProtocolTVL(protocol: string): Promise<number> {
    const cacheKey = `tvl:${protocol}`;

    // Check cache
    const cached = this.getFromCache<number>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const data = await httpClient.get(`https://api.llama.fi/protocol/${protocol}`, { timeout: 8000 });
      const tvl = data.tvl?.[data.tvl.length - 1]?.totalLiquidityUSD || 0;

      // Cache result
      this.setCache(cacheKey, tvl);

      return tvl;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Map chain name to DeFiLlama chain prefix
   */
  private mapChainToPrefix(chain: string): string {
    const mapping: Record<string, string> = {
      'ethereum': 'ethereum',
      'bsc': 'bsc',
      'polygon': 'polygon',
      'arbitrum': 'arbitrum',
      'optimism': 'optimism',
      'base': 'base',
      'avalanche': 'avax'
    };

    const prefix = mapping[chain.toLowerCase()];
    if (!prefix) {
      throw new Error(`Unsupported chain for DeFiLlama: ${chain}`);
    }

    return prefix;
  }

  /**
   * Cache helpers
   */
  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > this.cacheTTL) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });

    // Cleanup old entries
    if (this.cache.size > 500) {
      const now = Date.now();
      for (const [k, v] of this.cache.entries()) {
        if (now - v.timestamp > this.cacheTTL) {
          this.cache.delete(k);
        }
      }
    }
  }
}
