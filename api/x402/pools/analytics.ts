/**
 * x402 Pool Analytics API Endpoint
 * With real payment verification and rate limiting
 */

import { AIAgentDataService } from '../../../src/data-service.js';
import { withX402Auth, createEndpointConfig } from '../../../src/utils/api-wrapper.js';

// Initialize data service
const dataService = new AIAgentDataService();

// Endpoint configuration
const config = createEndpointConfig({
  price: 0.002,
  endpointUrl: 'https://x402-mcp-server.vercel.app/api/x402/pools/analytics',
  description: 'Liquidity pool analytics - TVL, APY, volume, and fee metrics',
  requiredParams: ['pool_address'],
  optionalParams: ['chain'],
  bazaar: {
    discoverable: true,
    category: 'defi',
    tags: ['liquidity', 'pool', 'analytics', 'tvl', 'apy'],
    info: {
      input: {
        type: 'http',
        method: 'GET',
        queryParams: {
          pool_address: '0x...',
          chain: 'ethereum'
        }
      },
      output: {
        type: 'json',
        example: {
          pool_address: '0x...',
          tvl_usd: 45678901.23,
          apy: 12.45
        }
      }
    }
  }
});

// Handler function
export default withX402Auth(config, async (params) => {
  const poolData = await dataService.getPoolAnalytics(params.pool_address, params.chain);

  return {
    pool_address: poolData.poolAddress,
    chain: poolData.chain,
    token0: poolData.token0,
    token1: poolData.token1,
    tvl_usd: poolData.tvl,
    volume_24h: poolData.volume24h,
    volume_7d: poolData.volume7d,
    fee_24h: poolData.fee24h,
    apy: poolData.apy,
    impermanent_loss: poolData.impermanentLoss,
    dex: poolData.dex,
    timestamp: Date.now()
  };
});
