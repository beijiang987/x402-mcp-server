/**
 * AI Agent 数据服务层
 * 提供实时链上数据、DEX 分析、价格聚合等服务
 */

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

export class DataService {
  private rpcUrls: Map<string, string> = new Map();
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private CACHE_TTL = 10000; // 10 seconds

  constructor() {
    this.initializeRpcUrls();
  }

  private initializeRpcUrls() {
    // 从环境变量读取 RPC URLs
    this.rpcUrls.set('ethereum', process.env.X402_ETH_RPC_URL || 'https://eth.llamarpc.com');
    this.rpcUrls.set('base', process.env.X402_BASE_RPC_URL || 'https://mainnet.base.org');
    this.rpcUrls.set('polygon', process.env.X402_POLYGON_RPC_URL || 'https://polygon-rpc.com');
    this.rpcUrls.set('arbitrum', process.env.X402_ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc');
    this.rpcUrls.set('optimism', process.env.X402_OPTIMISM_RPC_URL || 'https://mainnet.optimism.io');
  }

  /**
   * 获取代币价格（单链）
   */
  async getTokenPrice(tokenAddress: string, chain: string = 'ethereum'): Promise<TokenPrice> {
    const cacheKey = `price_${chain}_${tokenAddress}`;
    const cached = this.getCache(cacheKey);
    if (cached) return cached;

    try {
      // 调用多个数据源并聚合
      const price = await this.fetchTokenPriceFromDex(tokenAddress, chain);

      this.setCache(cacheKey, price);
      return price;
    } catch (error) {
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
      const tokenAddresses = this.getTokenAddressBySymbol(tokenSymbol);
      const pricePromises = chains.map(async (chain) => {
        const address = tokenAddresses[chain];
        if (!address) return null;

        try {
          const price = await this.getTokenPrice(address, chain);
          return {
            chain,
            data: {
              price: price.price,
              liquidity: price.liquidity,
              bestDex: price.source,
            },
          };
        } catch {
          return null;
        }
      });

      const results = await Promise.all(pricePromises);
      const prices: any = {};

      results.forEach((result) => {
        if (result) {
          prices[result.chain] = result.data;
        }
      });

      // 计算套利机会
      const arbitrageOpportunity = this.calculateArbitrage(prices);

      const result: MultiChainPrice = {
        token: tokenSymbol,
        prices,
        arbitrageOpportunity,
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
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
      // 这里需要调用 Uniswap V3 subgraph 或类似服务
      const analytics = await this.fetchPoolData(poolAddress, chain);

      this.setCache(cacheKey, analytics);
      return analytics;
    } catch (error) {
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
      // 这里需要监听链上事件或查询 subgraph
      const transactions = await this.fetchWhaleTransactions(
        tokenAddress,
        chain,
        minAmountUsd,
        limit
      );

      this.setCache(cacheKey, transactions, 5000); // 5 秒缓存
      return transactions;
    } catch (error) {
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
      const safety = await this.analyzeContractSafety(contractAddress, chain);

      this.setCache(cacheKey, safety, 300000); // 5 分钟缓存
      return safety;
    } catch (error) {
      throw new Error(`Failed to scan contract safety: ${error}`);
    }
  }

  // ========== 私有方法：数据获取 ==========

  private async fetchTokenPriceFromDex(
    tokenAddress: string,
    chain: string
  ): Promise<TokenPrice> {
    // 这里实现实际的 DEX 数据获取逻辑
    // 可以使用：
    // 1. Uniswap V3 SDK
    // 2. DEX Aggregator API (1inch, 0x)
    // 3. 直接查询链上合约

    // 临时返回模拟数据
    return {
      address: tokenAddress,
      symbol: 'MOCK',
      price: 1850.50,
      priceUsd: 1850.50,
      liquidity: 5000000,
      volume24h: 1200000,
      chain,
      source: 'Uniswap V3',
      timestamp: Date.now(),
    };
  }

  private async fetchPoolData(poolAddress: string, chain: string): Promise<PoolAnalytics> {
    // 实现池子数据获取
    return {
      poolAddress,
      token0: '0x...',
      token1: '0x...',
      tvl: 10000000,
      volume24h: 500000,
      volume7d: 3500000,
      fee24h: 1500,
      apy: 12.5,
      impermanentLoss: 0.5,
      chain,
      dex: 'Uniswap V3',
    };
  }

  private async fetchWhaleTransactions(
    tokenAddress: string,
    chain: string,
    minAmountUsd: number,
    limit: number
  ): Promise<WhaleTransaction[]> {
    // 实现巨鲸交易监控
    return [];
  }

  private async analyzeContractSafety(
    contractAddress: string,
    chain: string
  ): Promise<ContractSafety> {
    // 实现合约安全分析
    // 可以集成：GoPlus Security API, Honeypot.is 等
    return {
      address: contractAddress,
      riskScore: 25,
      isVerified: true,
      hasProxies: false,
      hasHoneypot: false,
      ownershipRenounced: true,
      risks: [],
      warnings: ['High concentration in top 10 holders'],
      chain,
    };
  }

  // ========== 辅助方法 ==========

  private getTokenAddressBySymbol(symbol: string): { [chain: string]: string } {
    // 常见代币的跨链地址映射
    const tokenMap: { [key: string]: { [chain: string]: string } } = {
      USDC: {
        ethereum: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        base: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        polygon: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
      },
      WETH: {
        ethereum: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        base: '0x4200000000000000000000000000000000000006',
        polygon: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
      },
      USDT: {
        ethereum: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        polygon: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
      },
    };

    return tokenMap[symbol.toUpperCase()] || {};
  }

  private calculateArbitrage(prices: any): any {
    const chains = Object.keys(prices);
    if (chains.length < 2) return undefined;

    let maxProfit = 0;
    let bestBuyChain = '';
    let bestSellChain = '';

    for (const buyChain of chains) {
      for (const sellChain of chains) {
        if (buyChain === sellChain) continue;

        const buyPrice = prices[buyChain].price;
        const sellPrice = prices[sellChain].price;
        const profit = ((sellPrice - buyPrice) / buyPrice) * 100;

        if (profit > maxProfit) {
          maxProfit = profit;
          bestBuyChain = buyChain;
          bestSellChain = sellChain;
        }
      }
    }

    if (maxProfit > 0.5) {
      // 至少 0.5% 的套利空间才值得
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

    // 自动清理过期缓存
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
