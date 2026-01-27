/**
 * x402 Contract Safety API Endpoint
 * With real payment verification and rate limiting
 */

import { AIAgentDataService } from '../../../src/data-service.js';
import { withX402Auth, createEndpointConfig } from '../../../src/utils/api-wrapper.js';

// Initialize data service
const dataService = new AIAgentDataService();

// Endpoint configuration
const config = createEndpointConfig({
  price: 0.02,
  endpointUrl: 'https://x402-mcp-server.vercel.app/api/x402/contracts/safety',
  description: 'Smart contract safety scan - Honeypot detection, risk scoring, and vulnerability analysis',
  requiredParams: ['contract_address'],
  optionalParams: ['chain'],
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
});

// Handler function
export default withX402Auth(config, async (params) => {
  const safetyData = await dataService.scanContractSafety(params.contract_address, params.chain);

  return {
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
  };
});
