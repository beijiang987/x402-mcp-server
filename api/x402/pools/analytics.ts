/**
 * x402 Pool Analytics API Endpoint
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { AIAgentDataService } from '../../../src/data-service.js';

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
        url: 'https://x402-mcp-server.vercel.app/api/x402/pools/analytics',
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

  if (!poolAddress) {
    return res.status(400).json({
      error: 'Missing required parameter: pool_address'
    });
  }

  try {
    // Call real data service
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
      }
    });
  } catch (error: any) {
    return res.status(500).json({
      error: 'Failed to fetch pool analytics',
      message: error.message
    });
  }
}
