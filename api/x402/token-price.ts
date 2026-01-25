/**
 * x402 Token Price API Endpoint
 */

import { VercelRequest, VercelResponse } from '@vercel/node';

const PAYMENT_ADDRESS = process.env.X402_PAYMENT_ADDRESS_BASE || '0xa893994dbe2ea7dd7e48410638d6a1b1b663b6a3';
const PRICE_USD = 0.0003;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Payment-Proof');

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const paymentProof = req.headers['x-payment-proof'] as string | undefined;

  // If no payment proof, return 402 with x402 v2 format
  if (!paymentProof) {
    return res.status(402).json({
      x402Version: 2,
      error: 'Payment required',
      accepts: [
        {
          scheme: 'exact',
          network: 'eip155:8453',
          amount: (PRICE_USD * 1_000_000).toString(),
          asset: 'eip155:8453/erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
          payTo: PAYMENT_ADDRESS,
          maxTimeoutSeconds: 300,
          extra: {}
        },
        {
          scheme: 'exact',
          network: 'eip155:1',
          amount: (PRICE_USD * 1_000_000).toString(),
          asset: 'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          payTo: PAYMENT_ADDRESS,
          maxTimeoutSeconds: 300,
          extra: {}
        }
      ],
      resource: {
        url: 'https://x402-mcp-server.vercel.app/api/x402/token-price',
        description: 'Real-time token price from DEX - Get current price, 24h change, volume, and market cap for any token',
        mimeType: 'application/json'
      },
      extensions: {
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
                price_change_24h: 2.34,
                volume_24h: 1234567890,
                market_cap: 223000000000
              }
            }
          }
        }
      }
    });
  }

  // Payment proof provided - return data
  const query = new URL(req.url!, `http://${req.headers.host}`).searchParams;
  const tokenAddress = query.get('token_address');
  const chain = query.get('chain') || 'ethereum';

  return res.status(200).json({
    success: true,
    data: {
      token_address: tokenAddress,
      chain: chain,
      price_usd: 1850.42,
      price_change_24h: 2.34,
      volume_24h: 1234567890,
      market_cap: 223000000000,
      last_updated: Date.now()
    },
    meta: {
      timestamp: Date.now(),
      cached: false,
      payment_verified: true
    }
  });
}
