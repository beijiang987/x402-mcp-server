/**
 * x402 Multichain Price API Endpoint
 * With real payment verification and rate limiting
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { AIAgentDataService } from '../../../../src/data-service.js';
import { authenticateRequest, send402Response, send429Response } from '../../../../src/api-middleware.js';

const PAYMENT_ADDRESS = process.env.X402_PAYMENT_ADDRESS_BASE || '0xa893994dbe2ea7dd7e48410638d6a1b1b663b6a3';
const PRICE_USD = 0.001;

// Initialize data service
const dataService = new AIAgentDataService();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Payment-Proof');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Authenticate and check rate limits
  const auth = await authenticateRequest(req, PRICE_USD, 'tokens/prices/multichain');

  // Check rate limit
  if (auth.rateLimitExceeded && auth.resetTime) {
    return send429Response(res, auth.resetTime, auth.tier);
  }

  // If not authenticated and no payment proof, return 402
  if (!auth.authenticated && !req.headers['x-payment-proof']) {
    return send402Response(
      res,
      PRICE_USD,
      PAYMENT_ADDRESS,
      'https://x402-mcp-server.vercel.app/api/x402/tokens/prices/multichain',
      'Multi-chain price aggregation - Compare token prices across multiple chains',
      {
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
      }
    );
  }

  const query = new URL(req.url!, `http://${req.headers.host}`).searchParams;
  const tokenSymbol = query.get('token_symbol');
  const chainsParam = query.get('chains');
  const chains = chainsParam ? chainsParam.split(',') : ['ethereum', 'base', 'polygon'];

  if (!tokenSymbol) {
    return res.status(400).json({
      error: 'Missing required parameter: token_symbol'
    });
  }

  // Authenticated - return data
  try {
    const multichainData = await dataService.getMultiChainPrice(tokenSymbol, chains);

    return res.status(200).json({
      success: true,
      data: {
        token_symbol: multichainData.token,
        prices: multichainData.prices,
        arbitrage_opportunity: multichainData.arbitrageOpportunity,
        timestamp: Date.now()
      },
      meta: {
        timestamp: Date.now(),
        tier: auth.tier,
        payment_verified: auth.tier === 'paid',
        tx_hash: auth.txHash,
        warning: auth.error
      }
    });
  } catch (error: any) {
    return res.status(500).json({
      error: 'Failed to fetch multichain prices',
      message: error.message
    });
  }
}
