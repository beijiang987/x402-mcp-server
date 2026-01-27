/**
 * Uniswap V3 Subgraph Data Source
 *
 * Free, unlimited queries
 * GraphQL API via The Graph
 * Documentation: https://docs.uniswap.org/api/subgraph/overview
 */

import { httpClient } from '../utils/http-client.js';

interface PoolAnalytics {
  pool_address: string;
  chain: string;
  token0: {
    address: string;
    symbol: string;
    decimals: number;
  };
  token1: {
    address: string;
    symbol: string;
    decimals: number;
  };
  tvl_usd: number;
  volume_24h_usd: number;
  volume_7d_usd: number;
  fee_tier: number; // in basis points (e.g., 3000 = 0.3%)
  apy: number;
  liquidity: string;
  last_updated: number;
}

interface WhaleTransaction {
  hash: string;
  timestamp: number;
  from: string;
  type: 'buy' | 'sell' | 'swap';
  token_address: string;
  token_symbol: string;
  amount_usd: number;
  amount_tokens: number;
  price_usd: number;
  pool_address: string;
}

/**
 * Uniswap Subgraph Data Source
 */
export class UniswapSubgraphDataSource {

  /**
   * Get pool analytics
   */
  async getPoolAnalytics(poolAddress: string, chain: string): Promise<PoolAnalytics> {
    // Get subgraph URL for chain
    const subgraphUrl = this.getSubgraphUrl(chain);

    // GraphQL query
    const query = `
      query GetPool($poolId: ID!) {
        pool(id: $poolId) {
          id
          token0 {
            id
            symbol
            decimals
          }
          token1 {
            id
            symbol
            decimals
          }
          totalValueLockedUSD
          volumeUSD
          feeTier
          liquidity
          poolDayData(first: 7, orderBy: date, orderDirection: desc) {
            volumeUSD
            tvlUSD
            feesUSD
          }
        }
      }
    `;

    const variables = {
      poolId: poolAddress.toLowerCase()
    };

    const response = await this.querySubgraph(subgraphUrl, query, variables);

    if (!response.data?.pool) {
      throw new Error(`Pool not found: ${poolAddress} on ${chain}`);
    }

    const pool = response.data.pool;

    // Calculate 24h and 7d volume
    const dayData = pool.poolDayData || [];
    const volume24h = dayData[0]?.volumeUSD || 0;
    const volume7d = dayData.reduce((sum: number, day: any) => sum + parseFloat(day.volumeUSD || '0'), 0);

    // Calculate APY (simplified)
    const fees24h = dayData[0]?.feesUSD || 0;
    const tvl = parseFloat(pool.totalValueLockedUSD || '0');
    const apy = tvl > 0 ? (parseFloat(fees24h) * 365 / tvl) * 100 : 0;

    const result: PoolAnalytics = {
      pool_address: poolAddress,
      chain: chain,
      token0: {
        address: pool.token0.id,
        symbol: pool.token0.symbol,
        decimals: parseInt(pool.token0.decimals)
      },
      token1: {
        address: pool.token1.id,
        symbol: pool.token1.symbol,
        decimals: parseInt(pool.token1.decimals)
      },
      tvl_usd: tvl,
      volume_24h_usd: parseFloat(volume24h),
      volume_7d_usd: volume7d,
      fee_tier: parseInt(pool.feeTier),
      apy: apy,
      liquidity: pool.liquidity,
      last_updated: Date.now()
    };

    return result;
  }

  /**
   * Get whale transactions for a token
   */
  async getWhaleTransactions(
    tokenAddress: string,
    chain: string,
    minAmountUSD: number = 100000,
    limit: number = 10
  ): Promise<WhaleTransaction[]> {
    // Get subgraph URL
    const subgraphUrl = this.getSubgraphUrl(chain);

    // GraphQL query for large swaps
    const query = `
      query GetSwaps($token: String!, $minAmount: String!) {
        swaps(
          first: ${limit}
          orderBy: timestamp
          orderDirection: desc
          where: {
            or: [
              { token0: $token },
              { token1: $token }
            ],
            amountUSD_gt: $minAmount
          }
        ) {
          id
          timestamp
          sender
          amount0
          amount1
          amountUSD
          token0 {
            id
            symbol
            decimals
          }
          token1 {
            id
            symbol
            decimals
          }
          pool {
            id
          }
        }
      }
    `;

    const variables = {
      token: tokenAddress.toLowerCase(),
      minAmount: minAmountUSD.toString()
    };

    const response = await this.querySubgraph(subgraphUrl, query, variables);

    const swaps = response.data?.swaps || [];

    // Parse swaps into whale transactions with null safety
    const result: WhaleTransaction[] = swaps
      .filter((swap: any) => {
        // Filter out invalid swaps
        return swap && swap.token0 && swap.token1 && swap.pool && swap.id;
      })
      .map((swap: any) => {
        // Safe token access with defaults
        const token0 = swap.token0 || { id: '', symbol: 'UNKNOWN', decimals: 18 };
        const token1 = swap.token1 || { id: '', symbol: 'UNKNOWN', decimals: 18 };

        const isToken0 = token0.id.toLowerCase() === tokenAddress.toLowerCase();
        const token = isToken0 ? token0 : token1;

        // Parse amounts safely
        const amount = parseFloat(isToken0 ? swap.amount0 : swap.amount1) || 0;
        const amountUSD = parseFloat(swap.amountUSD) || 0;
        const absAmount = Math.abs(amount);

        // Safe price calculation (avoid division by zero)
        const priceUsd = absAmount > 0 ? amountUSD / absAmount : 0;

        return {
          hash: swap.id.split('#')[0], // Extract tx hash from swap ID
          timestamp: parseInt(swap.timestamp) * 1000, // Convert to ms
          from: swap.sender || 'unknown',
          type: amount > 0 ? 'buy' : 'sell',
          token_address: token.id,
          token_symbol: token.symbol,
          amount_usd: amountUSD,
          amount_tokens: absAmount,
          price_usd: priceUsd,
          pool_address: swap.pool?.id || 'unknown'
        };
      });

    return result;
  }

  /**
   * Get subgraph URL for chain
   * Note: Free public endpoints with best effort availability
   */
  private getSubgraphUrl(chain: string): string {
    const urls: Record<string, string> = {
      // Using Uniswap Labs public endpoints (free, no auth required)
      'ethereum': 'https://api.studio.thegraph.com/query/3170/uniswap-v3-subgraph/version/latest',
      'polygon': 'https://api.thegraph.com/subgraphs/name/ianlapham/uniswap-v3-polygon',
      'arbitrum': 'https://api.thegraph.com/subgraphs/name/ianlapham/uniswap-arbitrum-one',
      'optimism': 'https://api.thegraph.com/subgraphs/name/ianlapham/optimism-post-regenesis',
      'base': 'https://api.studio.thegraph.com/query/48211/uniswap-v3-base/version/latest',
      'bsc': 'https://api.thegraph.com/subgraphs/name/pancakeswap/exchange-v3-bsc'
    };

    const url = urls[chain.toLowerCase()];
    if (!url) {
      throw new Error(`Unsupported chain for Uniswap/PancakeSwap: ${chain}`);
    }

    return url;
  }

  /**
   * Query subgraph with GraphQL
   */
  private async querySubgraph(url: string, query: string, variables: any): Promise<any> {
    const data = await httpClient.post(
      url,
      { query, variables },
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 10000
      }
    );

    if (data.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
    }

    return data;
  }

}
