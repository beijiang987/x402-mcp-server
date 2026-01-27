/**
 * x402 Token Price API Endpoint
 * With real payment verification and rate limiting
 */

import { AIAgentDataService } from '../../../src/data-service.js';
import { withX402Auth, createEndpointConfig } from '../../../src/utils/api-wrapper.js';

// Initialize data service
const dataService = new AIAgentDataService();

// Endpoint configuration
const config = createEndpointConfig({
  price: 0.0003,
  endpointUrl: 'https://x402-mcp-server.vercel.app/api/x402/tokens/price',
  description: 'Real-time token price from DEX - Get current price, 24h change, volume, and market cap for any token',
  requiredParams: ['token_address'],
  optionalParams: ['chain'],
  bazaar: {
    discoverable: true,
    category: 'defi',
    tags: ['price', 'token', 'dex', 'analytics'],
    info: {
      input: {
        type: 'http',
        method: 'GET',
        queryParams: {
          token_address: '0x...',
          chain: 'ethereum'
        }
      },
      output: {
        type: 'json',
        example: {
          token_address: '0x...',
          chain: 'ethereum',
          price_usd: 1850.42,
          volume_24h: 1234567890
        }
      }
    }
  }
});

// Handler function
export default withX402Auth(config, async (params) => {
  const tokenData = await dataService.getTokenPrice(params.token_address, params.chain);

  return {
    token_address: tokenData.address,
    symbol: tokenData.symbol,
    chain: tokenData.chain,
    price_usd: tokenData.priceUsd,
    liquidity: tokenData.liquidity,
    volume_24h: tokenData.volume24h,
    source: tokenData.source,
    last_updated: tokenData.timestamp
  };
});
