/**
 * x402 Token Price API Endpoint
 * With real payment verification and rate limiting
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { AIAgentDataService } from '../../../src/data-service.js';
import { authenticateRequest, send402Response, send429Response } from '../../../src/api-middleware.js';

const PAYMENT_ADDRESS = process.env.X402_PAYMENT_ADDRESS_BASE || '0xa893994dbe2ea7dd7e48410638d6a1b1b663b6a3';
const PRICE_USD = 0.0003;

// Initialize data service
const dataService = new AIAgentDataService();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Payment-Proof');

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Authenticate and check rate limits
  const auth = await authenticateRequest(
    req,
    PRICE_USD,
    'tokens/price'
  );

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
      'https://x402-mcp-server.vercel.app/api/x402/tokens/price',
      'Real-time token price from DEX - Get current price, 24h change, volume, and market cap for any token',
      {
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
      }
    );
  }

  // Authenticated - return data
  const query = new URL(req.url!, `http://${req.headers.host}`).searchParams;
  const tokenAddress = query.get('token_address');
  const chain = query.get('chain') || 'ethereum';

  if (!tokenAddress) {
    return res.status(400).json({
      error: 'Missing required parameter: token_address'
    });
  }

  try {
    // Call real data service
    const tokenData = await dataService.getTokenPrice(tokenAddress, chain);

    return res.status(200).json({
      success: true,
      data: {
        token_address: tokenData.address,
        symbol: tokenData.symbol,
        chain: tokenData.chain,
        price_usd: tokenData.priceUsd,
        liquidity: tokenData.liquidity,
        volume_24h: tokenData.volume24h,
        source: tokenData.source,
        last_updated: tokenData.timestamp
      },
      meta: {
        timestamp: Date.now(),
        cached: false,
        tier: auth.tier,
        payment_verified: auth.tier === 'paid',
        tx_hash: auth.txHash,
        warning: auth.error // Include any warnings about payment verification
      }
    });
  } catch (error: any) {
    return res.status(500).json({
      error: 'Failed to fetch token price',
      message: error.message
    });
  }
}
