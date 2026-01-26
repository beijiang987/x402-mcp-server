/**
 * API Middleware for Payment and Rate Limiting
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { paymentVerification } from './payment-verification.js';
import { redisRateLimiter } from './redis-rate-limiter.js';

export interface AuthResult {
  authenticated: boolean;
  tier: 'free' | 'paid';
  txHash?: string;
  error?: string;
  rateLimitExceeded?: boolean;
  resetTime?: number;
}

/**
 * Authenticate and authorize request
 */
export async function authenticateRequest(
  req: VercelRequest,
  expectedPrice: number, // in USD
  endpoint: string
): Promise<AuthResult> {
  const paymentProof = req.headers['x-payment-proof'] as string | undefined;

  // No payment proof - check free tier rate limit
  if (!paymentProof) {
    const identifier = redisRateLimiter.getIdentifier(req);
    const rateCheck = await redisRateLimiter.checkLimit(identifier, 'free');

    if (!rateCheck.allowed) {
      return {
        authenticated: false,
        tier: 'free',
        error: 'Rate limit exceeded for free tier',
        rateLimitExceeded: true,
        resetTime: rateCheck.resetTime,
      };
    }

    return {
      authenticated: true,
      tier: 'free',
    };
  }

  // Payment proof provided - verify it
  const verification = await paymentVerification.verifyPayment(
    paymentProof,
    expectedPrice,
    endpoint
  );

  if (!verification.valid) {
    // Invalid payment - check free tier rate limit
    const identifier = redisRateLimiter.getIdentifier(req);
    const rateCheck = await redisRateLimiter.checkLimit(identifier, 'free');

    if (!rateCheck.allowed) {
      return {
        authenticated: false,
        tier: 'free',
        error: `Invalid payment proof and free tier rate limit exceeded. ${verification.error}`,
        rateLimitExceeded: true,
        resetTime: rateCheck.resetTime,
      };
    }

    return {
      authenticated: true,
      tier: 'free',
      error: `Payment verification failed: ${verification.error}. Serving as free tier request.`,
    };
  }

  // Valid payment - check paid tier rate limit
  const identifier = redisRateLimiter.getIdentifier(req, verification.txHash);
  const rateCheck = await redisRateLimiter.checkLimit(identifier, 'paid');

  if (!rateCheck.allowed) {
    return {
      authenticated: false,
      tier: 'paid',
      txHash: verification.txHash,
      error: 'Rate limit exceeded for paid tier',
      rateLimitExceeded: true,
      resetTime: rateCheck.resetTime,
    };
  }

  return {
    authenticated: true,
    tier: 'paid',
    txHash: verification.txHash,
  };
}

/**
 * Send 402 Payment Required response
 */
export function send402Response(
  res: VercelResponse,
  priceUsd: number,
  paymentAddress: string,
  resourceUrl: string,
  description: string,
  extensions?: any
): void {
  res.status(402).json({
    x402Version: 2,
    error: 'Payment required',
    accepts: [
      {
        scheme: 'exact',
        network: 'eip155:8453', // Base
        amount: (priceUsd * 1_000_000).toString(), // USDC has 6 decimals
        asset: 'eip155:8453/erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
        payTo: paymentAddress,
        maxTimeoutSeconds: 300,
        extra: {},
      },
      {
        scheme: 'exact',
        network: 'eip155:1', // Ethereum
        amount: (priceUsd * 1_000_000).toString(),
        asset: 'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC on Ethereum
        payTo: paymentAddress,
        maxTimeoutSeconds: 300,
        extra: {},
      },
    ],
    resource: {
      url: resourceUrl,
      description: description,
      mimeType: 'application/json',
    },
    extensions: extensions || {},
  });
}

/**
 * Send 429 Rate Limit Exceeded response
 */
export function send429Response(
  res: VercelResponse,
  resetTime: number,
  tier: 'free' | 'paid'
): void {
  const resetDate = new Date(resetTime).toISOString();
  const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);

  res.status(429).json({
    error: 'Rate limit exceeded',
    tier: tier,
    message: tier === 'free'
      ? 'Free tier limited to 10 requests per day. Please provide payment proof for higher limits.'
      : 'Paid tier limited to 60 requests per minute.',
    resetTime: resetDate,
    retryAfter: retryAfter,
  });

  res.setHeader('Retry-After', retryAfter.toString());
  res.setHeader('X-RateLimit-Reset', resetDate);
}
