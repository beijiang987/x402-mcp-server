/**
 * x402 Pool Analytics API Endpoint
 * With real payment verification and rate limiting
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { AIAgentDataService } from '../../../src/data-service.js';
import { authenticateRequest, send402Response, send429Response } from '../../../src/api-middleware.js';

const PAYMENT_ADDRESS = process.env.X402_PAYMENT_ADDRESS_BASE || '0xa893994dbe2ea7dd7e48410638d6a1b1b663b6a3';
const PRICE_USD = 0.002;

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
  const auth = await authenticateRequest(req, PRICE_USD, 'pools/analytics');

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
      'https://x402-mcp-server.vercel.app/api/x402/pools/analytics',
      'Liquidity pool analytics - TVL, APY, volume, and fee metrics',
      {
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
      }
    );
  }

  const query = new URL(req.url!, `http://${req.headers.host}`).searchParams;
  const poolAddress = query.get('pool_address');
  const chain = query.get('chain') || 'ethereum';

  if (!poolAddress) {
    return res.status(400).json({
      error: 'Missing required parameter: pool_address'
    });
  }

  // Authenticated - return data
  try {
    const poolData = await dataService.getPoolAnalytics(poolAddress, chain);

    return res.status(200).json({
      success: true,
      data: {
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
      error: 'Failed to fetch pool analytics',
      message: error.message
    });
  }
}
