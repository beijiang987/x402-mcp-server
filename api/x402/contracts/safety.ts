/**
 * x402 Contract Safety API Endpoint
 * With real payment verification and rate limiting
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { AIAgentDataService } from '../../../src/data-service.js';
import { authenticateRequest, send402Response, send429Response } from '../../../src/api-middleware.js';

const PAYMENT_ADDRESS = process.env.X402_PAYMENT_ADDRESS_BASE || '0xa893994dbe2ea7dd7e48410638d6a1b1b663b6a3';
const PRICE_USD = 0.02;

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
  const auth = await authenticateRequest(req, PRICE_USD, 'contracts/safety');

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
      'https://x402-mcp-server.vercel.app/api/x402/contracts/safety',
      'Smart contract safety scan - Honeypot detection, risk scoring, and vulnerability analysis',
      {
        bazaar: {
          discoverable: true,
          category: 'security',
          tags: ['security', 'audit', 'honeypot', 'contract-analysis'],
          info: {
            input: {
              type: 'http',
              method: 'GET',
              queryParams: {
                contract_address: '0x...'
              }
            },
            output: {
              type: 'json',
              example: {
                is_honeypot: false,
                risk_score: 15
              }
            }
          }
        }
      }
    );
  }

  const query = new URL(req.url!, `http://${req.headers.host}`).searchParams;
  const contractAddress = query.get('contract_address');
  const chain = query.get('chain') || 'ethereum';

  if (!contractAddress) {
    return res.status(400).json({
      error: 'Missing required parameter: contract_address'
    });
  }

  // Authenticated - return data
  try {
    const safetyData = await dataService.scanContractSafety(contractAddress, chain);

    return res.status(200).json({
      success: true,
      data: {
        contract_address: safetyData.address,
        chain: safetyData.chain,
        risk_score: safetyData.riskScore,
        is_verified: safetyData.isVerified,
        has_proxies: safetyData.hasProxies,
        has_honeypot: safetyData.hasHoneypot,
        ownership_renounced: safetyData.ownershipRenounced,
        risks: safetyData.risks,
        warnings: safetyData.warnings,
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
      error: 'Failed to scan contract safety',
      message: error.message
    });
  }
}
