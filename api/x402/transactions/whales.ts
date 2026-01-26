/**
 * x402 Whale Transactions API Endpoint
 * With real payment verification and rate limiting
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { AIAgentDataService } from '../../../src/data-service.js';
import { authenticateRequest, send402Response, send429Response } from '../../../src/api-middleware.js';

const PAYMENT_ADDRESS = process.env.X402_PAYMENT_ADDRESS_BASE || '0xa893994dbe2ea7dd7e48410638d6a1b1b663b6a3';
const PRICE_USD = 0.005;

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
  const auth = await authenticateRequest(req, PRICE_USD, 'transactions/whales');

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
      'https://x402-mcp-server.vercel.app/api/x402/transactions/whales',
      'Whale transaction monitoring - Track large transfers and smart money movements',
      {
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
      }
    );
  }

  const query = new URL(req.url!, `http://${req.headers.host}`).searchParams;
  const tokenAddress = query.get('token_address');
  const chain = query.get('chain') || 'ethereum';
  const minAmountUsd = parseInt(query.get('min_value_usd') || '100000');
  const limit = parseInt(query.get('limit') || '10');

  if (!tokenAddress) {
    return res.status(400).json({
      error: 'Missing required parameter: token_address'
    });
  }

  // Authenticated - return data
  try {
    const whaleData = await dataService.getWhaleTransactions(tokenAddress, chain, minAmountUsd, limit);

    return res.status(200).json({
      success: true,
      data: {
        token_address: tokenAddress,
        chain: chain,
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
      error: 'Failed to fetch whale transactions',
      message: error.message
    });
  }
}
