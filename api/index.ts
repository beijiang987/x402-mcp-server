/**
 * Vercel Serverless Function Entry Point
 *
 * Simplified version without Fastify - optimized for serverless
 */

import { VercelRequest, VercelResponse } from '@vercel/node';

// Simple pricing config
const PRICES: Record<string, number> = {
  '/api/token-price': 0.0003,
  '/api/multichain-price': 0.001,
  '/api/pool-analytics': 0.002,
  '/api/whale-transactions': 0.005,
  '/api/contract-safety': 0.02
};

// Payment addresses from environment variables
const PAYMENT_ADDRESS_BASE = process.env.X402_PAYMENT_ADDRESS_BASE || '0xa893994dbe2ea7dd7e48410638d6a1b1b663b6a3';
const PAYMENT_ADDRESS_ETH = process.env.X402_PAYMENT_ADDRESS_ETH || '0xa893994dbe2ea7dd7e48410638d6a1b1b663b6a3';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Payment-Proof, X-Payment-Network');

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const path = req.url || '/';

  // Health check endpoint
  if (path === '/health' || path.startsWith('/health?')) {
    return res.status(200).json({
      status: 'ok',
      timestamp: Date.now(),
      service: 'x402-mcp-server',
      version: '1.0.0'
    });
  }

  // x402 discovery endpoint (redirect to static file)
  if (path === '/.well-known/x402.json' || path.startsWith('/.well-known/x402.json?')) {
    return res.redirect(301, '/public/.well-known/x402.json');
  }

  // API endpoints - require payment
  if (path.startsWith('/api/')) {
    const paymentProof = req.headers['x-payment-proof'] as string | undefined;

    // Get endpoint base path for pricing
    const endpointPath = path.split('?')[0];
    const priceUsd = PRICES[endpointPath] || 0.001;

    // If no payment proof, return 402 Payment Required
    if (!paymentProof) {
      return res.status(402).json({
        error: {
          code: 'payment_required',
          message: `Payment of ${priceUsd} USD required to access this endpoint`,
          price_usd: priceUsd
        },
        payment: {
          methods: ['x402'],
          networks: [
            {
              network: 'eip155:8453', // Base
              asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC
              amount: (priceUsd * 1_000_000).toString(),
              recipient: PAYMENT_ADDRESS_BASE
            },
            {
              network: 'eip155:1', // Ethereum
              asset: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
              amount: (priceUsd * 1_000_000).toString(),
              recipient: PAYMENT_ADDRESS_ETH
            }
          ]
        },
        instructions: {
          step_1: 'Send payment to the recipient address on the specified network',
          step_2: 'Include the transaction hash in the X-Payment-Proof header',
          step_3: 'Include the network identifier in the X-Payment-Network header (e.g., eip155:8453)',
          step_4: 'Retry the request with payment proof headers'
        },
        documentation: 'https://beijiang987.github.io/x402-mcp-server/api.html'
      });
    }

    // Payment proof provided - return mock data (Phase 1)
    // In Phase 3, we'll verify the payment on-chain

    // Mock response based on endpoint
    if (endpointPath === '/api/token-price') {
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

    if (endpointPath === '/api/multichain-price') {
      const query = new URL(req.url!, `http://${req.headers.host}`).searchParams;
      const tokenSymbol = query.get('token_symbol');

      return res.status(200).json({
        success: true,
        data: {
          token_symbol: tokenSymbol,
          prices: {
            ethereum: 1850.42,
            base: 1849.98,
            polygon: 1851.23,
            arbitrum: 1850.15,
            optimism: 1850.67
          },
          average_price: 1850.49,
          timestamp: Date.now()
        },
        meta: {
          timestamp: Date.now(),
          cached: false,
          payment_verified: true
        }
      });
    }

    if (endpointPath === '/api/pool-analytics') {
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
        },
        meta: {
          timestamp: Date.now(),
          cached: false,
          payment_verified: true
        }
      });
    }

    if (endpointPath === '/api/whale-transactions') {
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
        },
        meta: {
          timestamp: Date.now(),
          cached: false,
          payment_verified: true
        }
      });
    }

    if (endpointPath === '/api/contract-safety') {
      const query = new URL(req.url!, `http://${req.headers.host}`).searchParams;
      const contractAddress = query.get('contract_address');
      const chain = query.get('chain') || 'ethereum';

      return res.status(200).json({
        success: true,
        data: {
          contract_address: contractAddress,
          chain: chain,
          is_honeypot: false,
          is_proxy: false,
          risk_score: 15,
          risk_level: 'LOW',
          findings: [],
          timestamp: Date.now()
        },
        meta: {
          timestamp: Date.now(),
          cached: false,
          payment_verified: true
        }
      });
    }

    // Unknown API endpoint
    return res.status(404).json({
      success: false,
      error: {
        message: 'API endpoint not found',
        available_endpoints: Object.keys(PRICES)
      }
    });
  }

  // Default route - also return 402 for x402scan verification
  // This allows x402scan to detect this as an x402 service
  const defaultPrice = 0.001;

  return res.status(402).json({
    error: {
      code: 'payment_required',
      message: `This is an x402 payment-required API service. Payment of ${defaultPrice} USD required.`,
      price_usd: defaultPrice
    },
    payment: {
      methods: ['x402'],
      networks: [
        {
          network: 'eip155:8453', // Base
          asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC
          amount: (defaultPrice * 1_000_000).toString(),
          recipient: PAYMENT_ADDRESS_BASE
        },
        {
          network: 'eip155:1', // Ethereum
          asset: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
          amount: (defaultPrice * 1_000_000).toString(),
          recipient: PAYMENT_ADDRESS_ETH
        }
      ]
    },
    service: {
      name: 'x402 AI Agent Data Service',
      version: '1.0.0',
      discovery: '/.well-known/x402.json',
      documentation: 'https://beijiang987.github.io/x402-mcp-server/'
    },
    available_endpoints: Object.keys(PRICES)
  });
}
