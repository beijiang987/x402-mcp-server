/**
 * x402 Multichain Price API Endpoint
 * With real payment verification and rate limiting
 */

import { AIAgentDataService } from '../../../../src/data-service.js';
import { withX402Auth, createEndpointConfig } from '../../../../src/utils/api-wrapper.js';

// Initialize data service
const dataService = new AIAgentDataService();

// Endpoint configuration
const config = createEndpointConfig({
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

// Handler function
export default withX402Auth(config, async (params) => {
  // Parse chains parameter (comma-separated or default)
  const chains = params.chains ? params.chains.split(',') : ['ethereum', 'base', 'polygon'];

  const multichainData = await dataService.getMultiChainPrice(params.token_symbol, chains);

  return {
    token_symbol: multichainData.token,
    prices: multichainData.prices,
    arbitrage_opportunity: multichainData.arbitrageOpportunity,
    timestamp: Date.now()
  };
});
