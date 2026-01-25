/**
 * x402 Whale Transactions API Endpoint
 */

import { VercelRequest, VercelResponse } from '@vercel/node';

const PAYMENT_ADDRESS = process.env.X402_PAYMENT_ADDRESS_BASE || '0xa893994dbe2ea7dd7e48410638d6a1b1b663b6a3';
const PRICE_USD = 0.005;

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
        url: 'https://x402-mcp-server.vercel.app/api/x402/whale-transactions',
        description: 'Whale transaction monitoring - Track large transfers and smart money movements',
        mimeType: 'application/json'
      },
      extensions: {
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
                chain: 'ethereum',
                min_value_usd: '100000'
              }
            },
            output: {
              type: 'json',
              example: {
                transactions: [{
                  hash: '0xabc...',
                  value_usd: 1500000,
                  timestamp: 1234567890
                }],
                total_count: 1
              }
            }
          },
          schema: {
            input: {
              type: 'object',
              properties: {
                token_address: {
                  type: 'string',
                  description: 'Token contract address'
                },
                chain: {
                  type: 'string',
                  description: 'Chain name'
                },
                min_value_usd: {
                  type: 'string',
                  description: 'Minimum transaction value in USD'
                }
              },
              required: ['token_address']
            },
            output: {
              type: 'object',
              properties: {
                transactions: { type: 'array' },
                total_count: { type: 'number' }
              }
            }
          }
        }
      }
    });
  }

  const query = new URL(req.url!, `http://${req.headers.host}`).searchParams;
  const tokenAddress = query.get('token_address');
  const chain = query.get('chain') || 'ethereum';

  return res.status(200).json({
    success: true,
    data: {
      token_address: tokenAddress,
      chain: chain,
      transactions: [
        {
          hash: '0xabc123...',
          from: '0xdef456...',
          to: '0x789ghi...',
          value_usd: 1500000,
          timestamp: Date.now() - 3600000
        }
      ],
      total_count: 1,
      timestamp: Date.now()
    }
  });
}
