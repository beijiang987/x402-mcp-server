/**
 * Unified x402 API Wrapper
 * Eliminates duplicate code across all API endpoints
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateRequest, send402Response, send429Response } from '../api-middleware.js';
import { sendSuccess, sendBadRequest, sendInternalError, sendMissingParameter } from './api-response.js';

/**
 * API Endpoint Configuration
 */
export interface X402EndpointConfig {
  // Payment configuration
  price: number;
  paymentAddress: string;
  endpointUrl: string;
  description: string;

  // Bazaar metadata
  bazaar: {
    discoverable: boolean;
    category: string;
    tags: string[];
    info: {
      input: {
        type: 'http';
        method: 'GET' | 'POST';
        queryParams?: Record<string, string>;
        bodyParams?: Record<string, string>;
      };
      output: {
        type: 'json';
        example: any;
      };
    };
  };

  // Parameter validation
  requiredParams?: string[];
  optionalParams?: string[];
}

/**
 * API Handler Function Type
 * Receives validated query parameters and returns data
 */
export type X402Handler<T = any> = (params: Record<string, string>) => Promise<T>;

/**
 * Unified x402 API Wrapper
 *
 * Handles all boilerplate:
 * - CORS headers
 * - OPTIONS request
 * - Authentication and rate limiting
 * - Payment verification
 * - Parameter validation
 * - Error handling
 * - Response formatting
 *
 * @param config - Endpoint configuration
 * @param handler - Data handler function
 */
export function withX402Auth<T = any>(
  config: X402EndpointConfig,
  handler: X402Handler<T>
) {
  return async function (req: VercelRequest, res: VercelResponse) {
    // 1. CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Payment-Proof');

    // 2. Handle OPTIONS request
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    // 3. Authenticate and check rate limits
    const auth = await authenticateRequest(
      req,
      config.price,
      config.endpointUrl.split('/').slice(-2).join('/') // Extract endpoint name from URL
    );

    // 4. Check rate limit
    if (auth.rateLimitExceeded && auth.resetTime) {
      return send429Response(res, auth.resetTime, auth.tier);
    }

    // 5. If not authenticated and no payment proof, return 402
    if (!auth.authenticated && !req.headers['x-payment-proof']) {
      return send402Response(
        res,
        config.price,
        config.paymentAddress,
        config.endpointUrl,
        config.description,
        { bazaar: config.bazaar }
      );
    }

    // 6. Parse query parameters
    const query = new URL(req.url!, `http://${req.headers.host}`).searchParams;
    const params: Record<string, string> = {};

    // Extract all query parameters
    query.forEach((value, key) => {
      params[key] = value;
    });

    // 7. Validate required parameters
    if (config.requiredParams) {
      for (const param of config.requiredParams) {
        if (!params[param]) {
          return sendMissingParameter(res, param);
        }
      }
    }

    // 8. Set default values for optional parameters
    if (config.optionalParams) {
      for (const param of config.optionalParams) {
        if (!params[param]) {
          // Set common defaults
          if (param === 'chain') {
            params[param] = 'ethereum';
          } else if (param === 'limit') {
            params[param] = '10';
          }
        }
      }
    }

    try {
      // 9. Call data handler
      const data = await handler(params);

      // 10. Send success response
      return sendSuccess(res, data, {
        tier: auth.tier,
        payment_verified: auth.tier === 'paid',
        tx_hash: auth.txHash,
        warning: auth.error, // Include any warnings about payment verification
      });
    } catch (error: any) {
      // 11. Handle errors
      return sendInternalError(res, 'Failed to fetch data', error);
    }
  };
}

/**
 * Create endpoint configuration helper
 * Provides defaults and ensures type safety
 */
export function createEndpointConfig(
  partial: Partial<X402EndpointConfig> & Pick<X402EndpointConfig, 'price' | 'endpointUrl' | 'description' | 'bazaar'>
): X402EndpointConfig {
  return {
    paymentAddress: process.env.X402_PAYMENT_ADDRESS_BASE || '0xa893994dbe2ea7dd7e48410638d6a1b1b663b6a3',
    requiredParams: [],
    optionalParams: [],
    ...partial,
  };
}
