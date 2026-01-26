/**
 * x402 Contract Safety API Endpoint
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { AIAgentDataService } from '../../../src/data-service.js';

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
        url: 'https://x402-mcp-server.vercel.app/api/x402/contracts/safety',
        description: 'Smart contract safety scan - Honeypot detection, risk scoring, and vulnerability analysis',
        mimeType: 'application/json'
      },
      extensions: {
        bazaar: {
          discoverable: true,
          category: 'security',
          tags: ['security', 'audit', 'honeypot', 'contract-analysis'],
          info: {
            input: {
              type: 'http',
              method: 'GET',
              queryParams: {
                contract_address: '0x...',
                chain: 'ethereum'
              }
            },
            output: {
              type: 'json',
              example: {
                is_honeypot: false,
                risk_score: 15,
                risk_level: 'LOW',
                findings: []
              }
            }
          },
          schema: {
            input: {
              type: 'object',
              properties: {
                contract_address: {
                  type: 'string',
                  description: 'Smart contract address to analyze'
                },
                chain: {
                  type: 'string',
                  description: 'Chain name'
                }
              },
              required: ['contract_address']
            },
            output: {
              type: 'object',
              properties: {
                is_honeypot: { type: 'boolean' },
                risk_score: { type: 'number' },
                risk_level: { type: 'string' },
                findings: { type: 'array' }
              }
            }
          }
        }
      }
    });
  }

  const query = new URL(req.url!, `http://${req.headers.host}`).searchParams;
  const contractAddress = query.get('contract_address');
  const chain = query.get('chain') || 'ethereum';

  if (!contractAddress) {
    return res.status(400).json({
      error: 'Missing required parameter: contract_address'
    });
  }

  try {
    // Call real data service
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
      }
    });
  } catch (error: any) {
    return res.status(500).json({
      error: 'Failed to scan contract safety',
      message: error.message
    });
  }
}
