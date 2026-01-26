/**
 * x402 Main Discovery Endpoint
 *
 * This endpoint serves as the main entry point for x402scan registration.
 * It returns a 402 Payment Required response and points to the discovery document
 * where all available endpoints can be found.
 */

import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Return 402 Payment Required with discovery information
  return res.status(402).json({
    x402Version: 2,
    error: 'Payment required',
    message: 'This is the x402 AI Agent Data Service discovery endpoint',

    // Point to discovery document
    discovery: {
      url: `${getBaseUrl(req)}/.well-known/x402.json`,
      description: 'Service discovery document listing all available endpoints'
    },

    // Service information
    service: {
      name: 'x402 AI Agent Data Service',
      description: 'Real-time blockchain data APIs for AI agents - Token prices, pool analytics, whale tracking, and contract security',
      version: '2.0',
      networks: ['ethereum', 'base', 'bsc', 'polygon', 'arbitrum', 'optimism'],
      endpoints: 5
    },

    // Available endpoints summary
    endpoints: [
      {
        path: '/api/x402/tokens/price',
        description: 'Real-time token price from DEX',
        pricing: '$0.0003 per call'
      },
      {
        path: '/api/x402/tokens/prices/multichain',
        description: 'Multi-chain price aggregation',
        pricing: '$0.001 per call'
      },
      {
        path: '/api/x402/pools/analytics',
        description: 'Liquidity pool analytics',
        pricing: '$0.002 per call'
      },
      {
        path: '/api/x402/transactions/whales',
        description: 'Whale transaction monitoring',
        pricing: '$0.005 per call'
      },
      {
        path: '/api/x402/contracts/safety',
        description: 'Smart contract safety scan',
        pricing: '$0.02 per call'
      }
    ],

    // Payment methods
    accepts: [
      {
        scheme: 'exact',
        network: 'eip155:8453',
        amount: '0',
        asset: 'eip155:8453/erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        payTo: process.env.X402_PAYMENT_ADDRESS_BASE || '0xa893994dbe2ea7dd7e48410638d6a1b1b663b6a3',
        maxTimeoutSeconds: 300,
        extra: {}
      },
      {
        scheme: 'exact',
        network: 'eip155:1',
        amount: '0',
        asset: 'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        payTo: process.env.X402_PAYMENT_ADDRESS_ETH || '0xa893994dbe2ea7dd7e48410638d6a1b1b663b6a3',
        maxTimeoutSeconds: 300,
        extra: {}
      }
    ],

    // Resource information
    resource: {
      url: `${getBaseUrl(req)}/api/x402`,
      description: 'x402 AI Agent Data Service - Discovery endpoint for blockchain data APIs',
      mimeType: 'application/json'
    },

    // Extensions
    extensions: {
      bazaar: {
        discoverable: true,
        category: 'defi',
        subcategory: 'data-services',
        tags: ['blockchain', 'defi', 'analytics', 'ai-agents', 'multi-chain', 'mcp'],

        // Input/Output schema (required by x402scan)
        info: {
          input: {
            type: 'http',
            method: 'GET',
            queryParams: {}
          },
          output: {
            type: 'json',
            example: {
              x402Version: 2,
              error: 'Payment required',
              message: 'x402 AI Agent Data Service discovery endpoint',
              discovery: {
                url: 'https://x402-mcp-server.vercel.app/.well-known/x402.json',
                description: 'Service discovery document'
              },
              service: {
                name: 'x402 AI Agent Data Service',
                endpoints: 5,
                networks: ['ethereum', 'base', 'bsc', 'polygon', 'arbitrum', 'optimism']
              }
            }
          }
        },

        // Discovery document link
        discoveryDocument: `${getBaseUrl(req)}/.well-known/x402.json`,

        // Links
        links: {
          website: `${getBaseUrl(req)}`,
          documentation: `${getBaseUrl(req)}/docs.html`,
          brochure: `${getBaseUrl(req)}/brochure.html`,
          github: 'https://github.com/beijiang987/x402-mcp-server'
        },

        // Contact
        contact: {
          support: 'support@x402-data.com'
        }
      }
    }
  });
}

/**
 * Get base URL from request
 */
function getBaseUrl(req: VercelRequest): string {
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers.host || 'x402-mcp-server.vercel.app';
  return `${protocol}://${host}`;
}
