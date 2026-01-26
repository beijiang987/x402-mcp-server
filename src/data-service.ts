/**
 * AI Agent 数据服务层
 * 提供实时链上数据、DEX 分析、价格聚合等服务
 *
 * 集成真实数据源：
 * - CoinGecko API (代币价格)
 * - GoPlus Security (合约安全)
 * - Uniswap Subgraph (流动池和交易)
 */

import { CoinGeckoDataSource } from './data-sources/coingecko.js';
import { GoPlusDataSource } from './data-sources/goplus.js';
import { UniswapSubgraphDataSource } from './data-sources/uniswap-subgraph.js';

export interface TokenPrice {
  address: string;
  symbol: string;
  price: number;
  priceUsd: number;
  liquidity: number;
  volume24h: number;
  chain: string;
  source: string;
  timestamp: number;
}

export interface PoolAnalytics {
  poolAddress: string;
  token0: string;
  token1: string;
  tvl: number;
  volume24h: number;
  volume7d: number;
  fee24h: number;
  apy: number;
  impermanentLoss: number;
  chain: string;
  dex: string;
}

export interface WhaleTransaction {
  hash: string;
  from: string;
  to: string;
  token: string;
  amount: number;
  amountUsd: number;
  type: 'buy' | 'sell' | 'transfer';
  timestamp: number;
  chain: string;
  dex?: string;
}

export interface ContractSafety {
  address: string;
  riskScore: number; // 0-100, 0 = safest
  isVerified: boolean;
  hasProxies: boolean;
  hasHoneypot: boolean;
  ownershipRenounced: boolean;
  risks: string[];
  warnings: string[];
  chain: string;
}

export interface MultiChainPrice {
  token: string;
  prices: {
    [chain: string]: {
      price: number;
      liquidity: number;
      bestDex: string;
    };
  };
  arbitrageOpportunity?: {
    buyChain: string;
    sellChain: string;
    potentialProfit: number;
  };
}

export class AIAgentDataService {
  private coingecko: CoinGeckoDataSource;
  private goplus: GoPlusDataSource;
  private uniswap: UniswapSubgraphDataSource;

  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private CACHE_TTL = 10000; // 10 seconds

  constructor() {
    // Initialize data sources
    this.coingecko = new CoinGeckoDataSource(process.env.COINGECKO_API_KEY);
    this.goplus = new GoPlusDataSource();
    this.uniswap = new UniswapSubgraphDataSource();
  }

  /**
   * 获取代币价格（单链）
   */
  async getTokenPrice(tokenAddress: string, chain: string = 'ethereum'): Promise<TokenPrice> {
    const cacheKey = `price_${chain}_${tokenAddress}`;
    const cached = this.getCache(cacheKey);
    if (cached) return cached;

    try {
      // Call CoinGecko API
      const priceData = await this.coingecko.getTokenPrice(tokenAddress, chain);

      // Map to our interface
      const result: TokenPrice = {
        address: priceData.token_address,
        symbol: 'TOKEN', // CoinGecko doesn't return symbol, would need separate call
        price: priceData.price_usd,
        priceUsd: priceData.price_usd,
        liquidity: 0, // Not provided by CoinGecko simple price endpoint
        volume24h: priceData.volume_24h,
        chain: priceData.chain,
        source: 'CoinGecko',
        timestamp: priceData.last_updated,
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Failed to fetch token price:', error);
      throw new Error(`Failed to fetch token price: ${error}`);
    }
  }

  /**
   * 跨链价格聚合
   */
  async getMultiChainPrice(
    tokenSymbol: string,
    chains: string[] = ['ethereum', 'base', 'polygon']
  ): Promise<MultiChainPrice> {
    const cacheKey = `multichain_${tokenSymbol}_${chains.join(',')}`;
    const cached = this.getCache(cacheKey);
    if (cached) return cached;

    try {
      // Call CoinGecko for multichain prices
      const pricesData = await this.coingecko.getMultichainPrices(tokenSymbol, chains);

      // Map to our format
      const prices: any = {};
      for (const chain of chains) {
        const priceData = pricesData[chain];
        if (priceData) {
          prices[chain] = {
            price: priceData.price_usd,
            liquidity: 0, // Not available from simple endpoint
            bestDex: 'DEX'
          };
        }
      }

      // Calculate arbitrage opportunity
      const arbitrageOpportunity = this.calculateArbitrage(prices);

      const result: MultiChainPrice = {
        token: tokenSymbol,
        prices,
        arbitrageOpportunity,
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Failed to fetch multi-chain price:', error);
      throw new Error(`Failed to fetch multi-chain price: ${error}`);
    }
  }

  /**
   * 获取流动池分析数据
   */
  async getPoolAnalytics(poolAddress: string, chain: string = 'ethereum'): Promise<PoolAnalytics> {
    const cacheKey = `pool_${chain}_${poolAddress}`;
    const cached = this.getCache(cacheKey);
    if (cached) return cached;

    try {
      // Call Uniswap Subgraph
      const poolData = await this.uniswap.getPoolAnalytics(poolAddress, chain);

      // Map to our interface
      const result: PoolAnalytics = {
        poolAddress: poolData.pool_address,
        token0: `${poolData.token0.symbol} (${poolData.token0.address})`,
        token1: `${poolData.token1.symbol} (${poolData.token1.address})`,
        tvl: poolData.tvl_usd,
        volume24h: poolData.volume_24h_usd,
        volume7d: poolData.volume_7d_usd,
        fee24h: (poolData.volume_24h_usd * poolData.fee_tier) / 1000000, // Convert basis points to fee
        apy: poolData.apy,
        impermanentLoss: 0, // Would need to calculate based on price changes
        chain: poolData.chain,
        dex: 'Uniswap V3',
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Failed to fetch pool analytics:', error);
      throw new Error(`Failed to fetch pool analytics: ${error}`);
    }
  }

  /**
   * 监控巨鲸交易
   */
  async getWhaleTransactions(
    tokenAddress: string,
    chain: string = 'ethereum',
    minAmountUsd: number = 100000,
    limit: number = 10
  ): Promise<WhaleTransaction[]> {
    const cacheKey = `whale_${chain}_${tokenAddress}_${minAmountUsd}`;
    const cached = this.getCache(cacheKey);
    if (cached) return cached;

    try {
      // Call Uniswap Subgraph for whale transactions
      const transactions = await this.uniswap.getWhaleTransactions(
        tokenAddress,
        chain,
        minAmountUsd,
        limit
      );

      // Map to our interface
      const result: WhaleTransaction[] = transactions.map(tx => ({
        hash: tx.hash,
        from: tx.from,
        to: tx.pool_address, // In swaps, "to" is the pool
        token: tx.token_address,
        amount: tx.amount_tokens,
        amountUsd: tx.amount_usd,
        type: tx.type as 'buy' | 'sell',
        timestamp: tx.timestamp,
        chain: chain,
        dex: 'Uniswap V3',
      }));

      this.setCache(cacheKey, result, 5000); // 5 second cache for whale txs
      return result;
    } catch (error) {
      console.error('Failed to fetch whale transactions:', error);
      throw new Error(`Failed to fetch whale transactions: ${error}`);
    }
  }

  /**
   * 合约安全扫描
   */
  async scanContractSafety(contractAddress: string, chain: string = 'ethereum'): Promise<ContractSafety> {
    const cacheKey = `safety_${chain}_${contractAddress}`;
    const cached = this.getCache(cacheKey);
    if (cached) return cached;

    try {
      // Call GoPlus Security API
      const safetyData = await this.goplus.scanContract(contractAddress, chain);

      // Map to our interface
      const result: ContractSafety = {
        address: safetyData.contract_address,
        riskScore: safetyData.risk_score,
        isVerified: safetyData.is_open_source,
        hasProxies: safetyData.is_proxy,
        hasHoneypot: safetyData.is_honeypot,
        ownershipRenounced: !safetyData.can_take_back_ownership,
        risks: safetyData.warnings.filter(w =>
          w.includes('honeypot') || w.includes('balance') || w.includes('destruct')
        ),
        warnings: safetyData.warnings,
        chain: safetyData.chain,
      };

      this.setCache(cacheKey, result, 300000); // 5 minute cache for safety scans
      return result;
    } catch (error) {
      console.error('Failed to scan contract safety:', error);
      throw new Error(`Failed to scan contract safety: ${error}`);
    }
  }

  // ========== 辅助方法 ==========

  private calculateArbitrage(prices: any): any {
    const chains = Object.keys(prices);
    if (chains.length < 2) return undefined;

    let maxProfit = 0;
    let bestBuyChain = '';
    let bestSellChain = '';

    for (const buyChain of chains) {
      for (const sellChain of chains) {
        if (buyChain === sellChain) continue;

        const buyPrice = prices[buyChain]?.price;
        const sellPrice = prices[sellChain]?.price;

        if (!buyPrice || !sellPrice) continue;

        const profit = ((sellPrice - buyPrice) / buyPrice) * 100;

        if (profit > maxProfit) {
          maxProfit = profit;
          bestBuyChain = buyChain;
          bestSellChain = sellChain;
        }
      }
    }

    if (maxProfit > 0.5) {
      // At least 0.5% arbitrage opportunity
      return {
        buyChain: bestBuyChain,
        sellChain: bestSellChain,
        potentialProfit: maxProfit,
      };
    }

    return undefined;
  }

  // ========== 缓存管理 ==========

  private getCache(key: string): any {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCache(key: string, data: any, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });

    // Auto-cleanup expired cache
    setTimeout(() => {
      this.cache.delete(key);
    }, ttl || this.CACHE_TTL);
  }

  /**
   * 清空缓存
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Maintain backward compatibility
export class DataService extends AIAgentDataService {}
