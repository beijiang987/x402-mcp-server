/**
 * CoinGecko API Data Source
 *
 * Free tier: 50 calls/minute
 * No API key required (optional for Pro)
 * Documentation: https://docs.coingecko.com/reference/introduction
 */

import { httpClient } from '../utils/http-client.js';

interface TokenPrice {
  token_address: string;
  chain: string;
  price_usd: number;
  price_change_24h: number;
  volume_24h: number;
  market_cap: number;
  last_updated: number;
}

interface CoinGeckoPriceResponse {
  [address: string]: {
    usd: number;
    usd_24h_change?: number;
    usd_24h_vol?: number;
    usd_market_cap?: number;
    last_updated_at?: number;
  };
}

/**
 * CoinGecko Data Source
 */
export class CoinGeckoDataSource {
  private baseUrl = 'https://api.coingecko.com/api/v3';
  private apiKey?: string;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTTL = 30000; // 30 seconds

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  /**
   * Get token price by contract address
   */
  async getTokenPrice(tokenAddress: string, chain: string): Promise<TokenPrice> {
    const cacheKey = `price:${chain}:${tokenAddress}`;

    // Check cache
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    // Map chain to CoinGecko platform ID
    const platform = this.mapChainToPlatform(chain);

    // Fetch from CoinGecko
    const url = `${this.baseUrl}/simple/token_price/${platform}`;
    const params = new URLSearchParams({
      contract_addresses: tokenAddress.toLowerCase(),
      vs_currencies: 'usd',
      include_24hr_change: 'true',
      include_24hr_vol: 'true',
      include_market_cap: 'true',
      include_last_updated_at: 'true'
    });

    const headers: Record<string, string> = {
      'Accept': 'application/json'
    };

    if (this.apiKey) {
      headers['x-cg-pro-api-key'] = this.apiKey;
    }

    const data: CoinGeckoPriceResponse = await httpClient.get(
      `${url}?${params}`,
      { headers, timeout: 8000 }
    );

    // Parse response
    const addressKey = tokenAddress.toLowerCase();
    const priceData = data[addressKey];

    if (!priceData) {
      throw new Error(`Token not found: ${tokenAddress} on ${chain}`);
    }

    const result: TokenPrice = {
      token_address: tokenAddress,
      chain: chain,
      price_usd: priceData.usd,
      price_change_24h: priceData.usd_24h_change || 0,
      volume_24h: priceData.usd_24h_vol || 0,
      market_cap: priceData.usd_market_cap || 0,
      last_updated: priceData.last_updated_at || Date.now()
    };

    // Cache result
    this.setCache(cacheKey, result);

    return result;
  }

  /**
   * Get prices for multiple tokens across chains
   */
  async getMultichainPrices(
    tokenSymbol: string,
    chains: string[]
  ): Promise<Record<string, TokenPrice | null>> {
    // For multichain, we'd need to:
    // 1. Map token symbol to contract addresses on different chains
    // 2. Query each chain's price
    // This is simplified for now - in production you'd maintain a token registry

    const results: Record<string, TokenPrice | null> = {};

    // Simplified: Try to get prices for known tokens
    const knownTokens = this.getKnownTokenAddresses(tokenSymbol);

    for (const chain of chains) {
      try {
        const address = knownTokens[chain];
        if (address) {
          results[chain] = await this.getTokenPrice(address, chain);
        } else {
          results[chain] = null;
        }
      } catch (error) {
        console.error(`Failed to get price for ${tokenSymbol} on ${chain}:`, error);
        results[chain] = null;
      }
    }

    return results;
  }

  /**
   * Map chain name to CoinGecko platform ID
   */
  private mapChainToPlatform(chain: string): string {
    const mapping: Record<string, string> = {
      'ethereum': 'ethereum',
      'base': 'base',
      'bsc': 'binance-smart-chain',
      'polygon': 'polygon-pos',
      'arbitrum': 'arbitrum-one',
      'optimism': 'optimistic-ethereum'
    };

    const platform = mapping[chain.toLowerCase()];
    if (!platform) {
      throw new Error(`Unsupported chain: ${chain}`);
    }

    return platform;
  }

  /**
   * Get known token addresses for common tokens
   * In production, this would come from a database or registry
   */
  private getKnownTokenAddresses(symbol: string): Record<string, string> {
    const registry: Record<string, Record<string, string>> = {
      'USDC': {
        'ethereum': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        'base': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        'polygon': '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
        'arbitrum': '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
      },
      'WETH': {
        'ethereum': '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        'base': '0x4200000000000000000000000000000000000006',
        'polygon': '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
        'arbitrum': '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'
      },
      'USDT': {
        'ethereum': '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        'bsc': '0x55d398326f99059fF775485246999027B3197955',
        'polygon': '0xc2132D05D31c914a87C6611C10748AEb04B58e8F'
      }
    };

    return registry[symbol.toUpperCase()] || {};
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

    // Cleanup old entries periodically
    if (this.cache.size > 1000) {
      const now = Date.now();
      for (const [k, v] of this.cache.entries()) {
        if (now - v.timestamp > this.cacheTTL) {
          this.cache.delete(k);
        }
      }
    }
  }
}
