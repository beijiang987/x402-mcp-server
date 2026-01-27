/**
 * x402 Whale Transactions API Endpoint
 * With real payment verification and rate limiting
 */

import { AIAgentDataService } from '../../../src/data-service.js';
import { withX402Auth, createEndpointConfig } from '../../../src/utils/api-wrapper.js';

// Initialize data service
const dataService = new AIAgentDataService();

// Endpoint configuration
const config = createEndpointConfig({
  price: 0.005,
  endpointUrl: 'https://x402-mcp-server.vercel.app/api/x402/transactions/whales',
  description: 'Whale transaction monitoring - Track large transfers and smart money movements',
  requiredParams: ['token_address'],
  optionalParams: ['chain', 'min_value_usd', 'limit'],
  bazaar: {
    discoverable: true,
    category: 'analytics',
    tags: ['whale', 'transactions', 'monitoring', 'large-transfers'],
    info: {
      input: {
        type: 'http',
        method: 'GET',
        queryParams: {
          token_address: '0x...',
          min_value_usd: '100000'
        }
      },
      output: {
        type: 'json',
        example: {
          transactions: [{
            hash: '0xabc...',
            value_usd: 1500000
          }]
        }
      }
    }
  }
});

// Handler function
export default withX402Auth(config, async (params) => {
  const minAmountUsd = parseInt(params.min_value_usd || '100000');
  const limit = parseInt(params.limit || '10');

  const whaleData = await dataService.getWhaleTransactions(
    params.token_address,
    params.chain,
    minAmountUsd,
    limit
  );

  return {
    token_address: params.token_address,
    chain: params.chain,
    min_value_usd: minAmountUsd,
    transactions: whaleData.map(tx => ({
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      token: tx.token,
      amount: tx.amount,
      amount_usd: tx.amountUsd,
      type: tx.type,
      timestamp: tx.timestamp,
      dex: tx.dex
    })),
    total_count: whaleData.length,
    timestamp: Date.now()
  };
});
