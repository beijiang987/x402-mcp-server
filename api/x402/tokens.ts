/**
 * x402 Token Price APIs - Consolidated Endpoint
 *
 * Routes:
 *   /api/x402/tokens?endpoint=price           - Single token price
 *   /api/x402/tokens?endpoint=multichain      - Multi-chain price aggregation
 *
 * For backwards compatibility with vercel.json rewrites:
 *   /api/x402/tokens/price         -> ?endpoint=price
 *   /api/x402/tokens/prices/multichain -> ?endpoint=multichain
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { AIAgentDataService } from '../../src/data-service.js';
import { withX402Auth, createEndpointConfig } from '../../src/utils/api-wrapper.js';

const dataService = new AIAgentDataService();

// ==================== PRICE ENDPOINT ====================

const priceConfig = createEndpointConfig({
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

const priceHandler = withX402Auth(priceConfig, async (params) => {
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

// ==================== MULTICHAIN ENDPOINT ====================

const multichainConfig = createEndpointConfig({
  price: 0.001,
  endpointUrl: 'https://x402-mcp-server.vercel.app/api/x402/tokens/prices/multichain',
  description: 'Multi-chain price aggregation - Compare token prices across multiple chains',
  requiredParams: ['token_symbol'],
  optionalParams: ['chains'],
  bazaar: {
    discoverable: true,
    category: 'defi',
    tags: ['price', 'multichain', 'aggregation', 'dex'],
    info: {
      input: {
        type: 'http',
        method: 'GET',
        queryParams: {
          token_symbol: 'WETH'
        }
      },
      output: {
        type: 'json',
        example: {
          token_symbol: 'WETH',
          prices: {
            ethereum: 1850.42,
            base: 1849.98
          }
        }
      }
    }
  }
});

const multichainHandler = withX402Auth(multichainConfig, async (params) => {
  const chains = params.chains ? params.chains.split(',') : ['ethereum', 'base', 'polygon'];
  const multichainData = await dataService.getMultiChainPrice(params.token_symbol, chains);

  return {
    token_symbol: multichainData.token,
    prices: multichainData.prices,
    arbitrage_opportunity: multichainData.arbitrageOpportunity,
    timestamp: Date.now()
  };
});

// ==================== ROUTER ====================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Determine which endpoint to use based on query parameter or path
  const endpoint = req.query.endpoint as string;

  // Route to appropriate handler
  if (endpoint === 'multichain') {
    return multichainHandler(req, res);
  } else if (endpoint === 'price' || !endpoint) {
    return priceHandler(req, res);
  } else {
    return res.status(400).json({
      error: 'Invalid endpoint',
      validEndpoints: ['price', 'multichain'],
      usage: {
        price: '/api/x402/tokens?endpoint=price&token_address=0x...',
        multichain: '/api/x402/tokens?endpoint=multichain&token_symbol=WETH'
      }
    });
  }
}
