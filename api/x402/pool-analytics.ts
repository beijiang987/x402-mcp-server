/**
 * x402 Pool Analytics API Endpoint
 */

import { VercelRequest, VercelResponse } from '@vercel/node';

const PAYMENT_ADDRESS = process.env.X402_PAYMENT_ADDRESS_BASE || '0xa893994dbe2ea7dd7e48410638d6a1b1b663b6a3';
const PRICE_USD = 0.002;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Payment-Proof');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const paymentProof = req.headers['x-payment-proof'] as string | undefined;

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
        }
      ],
      resource: {
        url: 'https://x402-mcp-server.vercel.app/api/x402/pool-analytics',
        description: 'Liquidity pool analytics - TVL, APY, volume, and fee metrics',
        mimeType: 'application/json'
      },
      extensions: {
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
                volume_24h: 12345678.90,
                apy: 12.45
              }
            }
          },
          schema: {
            input: {
              type: 'object',
              properties: {
                pool_address: {
                  type: 'string',
                  description: 'Pool contract address'
                },
                chain: {
                  type: 'string',
                  description: 'Chain name (ethereum, base, polygon, etc.)'
                }
              },
              required: ['pool_address']
            },
            output: {
              type: 'object',
              properties: {
                tvl_usd: { type: 'number' },
                volume_24h: { type: 'number' },
                apy: { type: 'number' }
              }
            }
          }
        }
      }
    });
  }

  const query = new URL(req.url!, `http://${req.headers.host}`).searchParams;
  const poolAddress = query.get('pool_address');
  const chain = query.get('chain') || 'ethereum';

  return res.status(200).json({
    success: true,
    data: {
      pool_address: poolAddress,
      chain: chain,
      tvl_usd: 45678901.23,
      volume_24h: 12345678.90,
      apy: 12.45,
      fee_tier: 0.3,
      token0: 'WETH',
      token1: 'USDC',
      timestamp: Date.now()
    }
  });
}
