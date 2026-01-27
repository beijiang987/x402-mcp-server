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
import { DeFiLlamaDataSource } from './data-sources/defillama.js';
import { DexScreenerDataSource } from './data-sources/dexscreener.js';
import {
  tokenPriceCache,
  poolAnalyticsCache,
  contractSafetyCache,
  multichainPriceCache,
  whaleTransactionCache,
} from './redis-cache-manager.js';

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
  private defillama: DeFiLlamaDataSource;
  private dexscreener: DexScreenerDataSource;

  constructor() {
    // Initialize data sources
    this.coingecko = new CoinGeckoDataSource(process.env.COINGECKO_API_KEY);
    this.goplus = new GoPlusDataSource();
    this.uniswap = new UniswapSubgraphDataSource();
    this.defillama = new DeFiLlamaDataSource();
    this.dexscreener = new DexScreenerDataSource();
  }

  /**
   * 获取代币价格（单链）
   */
  async getTokenPrice(tokenAddress: string, chain: string = 'ethereum'): Promise<TokenPrice> {
    const cacheKey = `${chain}_${tokenAddress}`;

    // Try Redis cache first
    const cached = await tokenPriceCache.get(cacheKey);
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

      // Store in Redis cache (30 seconds TTL)
      await tokenPriceCache.set(cacheKey, result);
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
    const cacheKey = `${tokenSymbol}_${chains.join(',')}`;

    // Try Redis cache first
    const cached = await multichainPriceCache.get(cacheKey);
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

      // Store in Redis cache (30 seconds TTL)
      await multichainPriceCache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Failed to fetch multi-chain price:', error);
      throw new Error(`Failed to fetch multi-chain price: ${error}`);
    }
  }

  /**
   * 获取流动池分析数据
   * Uses multiple data sources with fallback
   */
  async getPoolAnalytics(poolAddress: string, chain: string = 'ethereum'): Promise<PoolAnalytics> {
    const cacheKey = `${chain}_${poolAddress}`;

    // Try Redis cache first
    const cached = await poolAnalyticsCache.get(cacheKey);
    if (cached) return cached;

    // Parallel race strategy: query all sources with timeout, use fastest response
    const timeout = 5000; // 5 seconds timeout per source

    const sources = [
      {
        name: 'Uniswap',
        fetch: async () => {
          const poolData = await this.withTimeout(
            this.uniswap.getPoolAnalytics(poolAddress, chain),
            timeout
          );
          return {
            poolAddress: poolData.pool_address,
            token0: `${poolData.token0.symbol} (${poolData.token0.address})`,
            token1: `${poolData.token1.symbol} (${poolData.token1.address})`,
            tvl: poolData.tvl_usd,
            volume24h: poolData.volume_24h_usd,
            volume7d: poolData.volume_7d_usd,
            fee24h: (poolData.volume_24h_usd * poolData.fee_tier) / 1000000,
            apy: poolData.apy,
            impermanentLoss: 0,
            chain: poolData.chain,
            dex: 'Uniswap V3',
          };
        },
      },
      {
        name: 'DeFiLlama',
        fetch: async () => {
          const poolData = await this.withTimeout(
            this.defillama.getPoolAnalytics(poolAddress, chain),
            timeout
          );
          return {
            poolAddress: poolData.pool_address,
            token0: poolData.underlying_tokens[0] || 'Token0',
            token1: poolData.underlying_tokens[1] || 'Token1',
            tvl: poolData.tvl_usd,
            volume24h: poolData.volume_usd_1d,
            volume7d: poolData.volume_usd_7d,
            fee24h: poolData.volume_usd_1d * 0.003,
            apy: poolData.apy,
            impermanentLoss: 0,
            chain: poolData.chain,
            dex: poolData.project,
          };
        },
      },
      {
        name: 'DEX Screener',
        fetch: async () => {
          const pairData = await this.withTimeout(
            this.dexscreener.getPairAnalytics(poolAddress),
            timeout
          );
          return {
            poolAddress: pairData.pair_address,
            token0: `${pairData.base_token.symbol} (${pairData.base_token.address})`,
            token1: `${pairData.quote_token.symbol} (${pairData.quote_token.address})`,
            tvl: pairData.liquidity_usd,
            volume24h: pairData.volume_24h,
            volume7d: pairData.volume_24h * 7,
            fee24h: pairData.volume_24h * 0.003,
            apy: 0,
            impermanentLoss: 0,
            chain: pairData.chain,
            dex: pairData.dex,
          };
        },
      },
    ];

    // Race all sources - use the first successful response
    const results = await Promise.allSettled(sources.map((s) => s.fetch()));

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === 'fulfilled') {
        logger.info(`Pool analytics from ${sources[i].name}`, {
          poolAddress,
          chain,
        });
        // Store in Redis cache (60 seconds TTL)
        await poolAnalyticsCache.set(cacheKey, result.value);
        return result.value;
      } else {
        logger.warn(`${sources[i].name} failed:`, result.reason?.message);
      }
    }

    // All sources failed
    throw new Error('All pool analytics sources failed or timed out');
  }

  /**
   * Helper: Add timeout to promise
   */
  private withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
      ),
    ]);
  }

  /**
   * 监控巨鲸交易
   * Uses multiple data sources with fallback
   */
  async getWhaleTransactions(
    tokenAddress: string,
    chain: string = 'ethereum',
    minAmountUsd: number = 100000,
    limit: number = 10
  ): Promise<WhaleTransaction[]> {
    const cacheKey = `${chain}_${tokenAddress}_${minAmountUsd}`;

    // Try Redis cache first
    const cached = await whaleTransactionCache.get(cacheKey);
    if (cached) return cached;

    let result: WhaleTransaction[];

    // Try Uniswap Subgraph first
    try {
      const transactions = await this.uniswap.getWhaleTransactions(
        tokenAddress,
        chain,
        minAmountUsd,
        limit
      );

      result = transactions.map(tx => ({
        hash: tx.hash,
        from: tx.from,
        to: tx.pool_address,
        token: tx.token_address,
        amount: tx.amount_tokens,
        amountUsd: tx.amount_usd,
        type: tx.type as 'buy' | 'sell',
        timestamp: tx.timestamp,
        chain: chain,
        dex: 'Uniswap V3',
      }));

      // Store in Redis cache (120 seconds TTL)
      await whaleTransactionCache.set(cacheKey, result);
      return result;
    } catch (uniswapError) {
      console.warn('Uniswap Subgraph failed, trying DEX Screener:', uniswapError);
    }

    // Fallback: Try DEX Screener
    try {
      const transactions = await this.dexscreener.getWhaleTransactions(
        tokenAddress,
        chain,
        minAmountUsd,
        limit
      );

      result = transactions.map(tx => ({
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        token: tokenAddress,
        amount: tx.amount_tokens,
        amountUsd: tx.amount_usd,
        type: tx.type,
        timestamp: tx.timestamp,
        chain: chain,
        dex: 'DEX Aggregated',
      }));

      // Store in Redis cache (120 seconds TTL)
      await whaleTransactionCache.set(cacheKey, result);
      return result;
    } catch (dexscreenerError) {
      console.error('All whale transaction sources failed');
      throw new Error(`Failed to fetch whale transactions: ${dexscreenerError}`);
    }
  }

  /**
   * 合约安全扫描
   */
  async scanContractSafety(contractAddress: string, chain: string = 'ethereum'): Promise<ContractSafety> {
    const cacheKey = `${chain}_${contractAddress}`;

    // Try Redis cache first
    const cached = await contractSafetyCache.get(cacheKey);
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

      // Store in Redis cache (300 seconds = 5 minutes TTL)
      await contractSafetyCache.set(cacheKey, result, 300);
      return result;
    } catch (error) {
      console.error('Failed to scan contract safety:', error);
      throw new Error(`Failed to scan contract safety: ${error}`);
    }
  }

  // ========== 辅助方法 ==========

  /**
   * Calculate arbitrage opportunity using optimized O(n log n) approach
   * Previous: O(n²) nested loop
   * Current: O(n log n) sorting approach
   */
  private calculateArbitrage(prices: any): any {
    // Convert to array and filter out invalid prices
    const priceArray = Object.entries(prices)
      .map(([chain, data]: [string, any]) => ({
        chain,
        price: data?.price,
      }))
      .filter((item) => item.price && item.price > 0);

    if (priceArray.length < 2) return undefined;

    // Sort by price (ascending) - O(n log n)
    priceArray.sort((a, b) => a.price - b.price);

    // Maximum arbitrage is always between lowest and highest price
    const bestBuyChain = priceArray[0].chain;
    const bestSellChain = priceArray[priceArray.length - 1].chain;
    const buyPrice = priceArray[0].price;
    const sellPrice = priceArray[priceArray.length - 1].price;

    const maxProfit = ((sellPrice - buyPrice) / buyPrice) * 100;

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

  // ========== 已弃用：缓存现在使用 Redis ==========
  // 为了向后兼容，保留这些方法但不再使用
}

// Maintain backward compatibility
export class DataService extends AIAgentDataService {}
