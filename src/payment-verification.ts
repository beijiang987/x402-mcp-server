/**
 * x402 Payment Verification Service
 *
 * Verifies on-chain transactions for payment proof
 */

import { createPublicClient, http, parseUnits, formatUnits, type Address } from 'viem';
import { mainnet, base } from 'viem/chains';
import { logger } from './utils/logger.js';

interface PaymentProof {
  txHash: string;
  chain: string;
  token: string;
  amount: string;
  timestamp: number;
  signature?: string;
}

interface VerificationResult {
  valid: boolean;
  txHash?: string;
  amountPaid?: bigint;
  from?: Address;
  to?: Address;
  error?: string;
}

/**
 * Payment Verification Service
 */
export class PaymentVerificationService {
  private clients: Map<string, any> = new Map();
  private cache: Map<string, VerificationResult> = new Map();
  private cacheTTL = 3600000; // 1 hour

  // Payment addresses
  private readonly paymentAddresses = {
    base: (process.env.X402_PAYMENT_ADDRESS_BASE || '0xa893994dbe2ea7dd7e48410638d6a1b1b663b6a3').toLowerCase() as Address,
    ethereum: (process.env.X402_PAYMENT_ADDRESS_ETH || '0xa893994dbe2ea7dd7e48410638d6a1b1b663b6a3').toLowerCase() as Address,
  };

  // USDC token addresses
  private readonly usdcAddresses = {
    base: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as Address,
    ethereum: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address,
  };

  constructor() {
    // Initialize RPC clients
    this.clients.set('ethereum', createPublicClient({
      chain: mainnet,
      transport: http(process.env.RPC_ETH || 'https://eth.llamarpc.com'),
    }));

    this.clients.set('base', createPublicClient({
      chain: base,
      transport: http(process.env.RPC_BASE || 'https://mainnet.base.org'),
    }));
  }

  /**
   * Parse x402 payment proof header
   */
  parsePaymentProof(proofHeader: string): PaymentProof | null {
    try {
      // x402 v2 format: base64 encoded JSON or simple formats
      // For now, support simple txHash format and JSON format

      // Try to decode as base64 JSON
      try {
        const decoded = Buffer.from(proofHeader, 'base64').toString('utf-8');
        const parsed = JSON.parse(decoded);
        return parsed as PaymentProof;
      } catch {
        // Not base64 JSON, try direct JSON
        try {
          const parsed = JSON.parse(proofHeader);
          return parsed as PaymentProof;
        } catch {
          // Simple format: just txHash
          if (proofHeader.startsWith('0x') && proofHeader.length === 66) {
            return {
              txHash: proofHeader,
              chain: 'base', // Default to base
              token: this.usdcAddresses.base,
              amount: '0',
              timestamp: Date.now(),
            };
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Failed to parse payment proof:', error);
      return null;
    }
  }

  /**
   * Verify payment transaction on-chain
   */
  async verifyPayment(
    proofHeader: string,
    expectedAmount: number, // in USD (e.g., 0.001 = $0.001)
    endpoint: string
  ): Promise<VerificationResult> {
    // Parse payment proof
    const proof = this.parsePaymentProof(proofHeader);

    if (!proof || !proof.txHash) {
      return {
        valid: false,
        error: 'Invalid payment proof format',
      };
    }

    // Check cache
    const cacheKey = `${proof.txHash}_${expectedAmount}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Get client for chain
      const chain = proof.chain.toLowerCase();
      const client = this.clients.get(chain);

      if (!client) {
        return {
          valid: false,
          error: `Unsupported chain: ${proof.chain}`,
        };
      }

      // Get transaction receipt
      const receipt = await client.getTransactionReceipt({
        hash: proof.txHash as Address,
      });

      if (!receipt) {
        return {
          valid: false,
          error: 'Transaction not found',
        };
      }

      // Check transaction status
      if (receipt.status !== 'success') {
        return {
          valid: false,
          error: 'Transaction failed',
        };
      }

      // Get transaction details
      const tx = await client.getTransaction({
        hash: proof.txHash as Address,
      });

      // Verify recipient address
      const expectedTo = this.paymentAddresses[chain as keyof typeof this.paymentAddresses];
      if (!expectedTo) {
        return {
          valid: false,
          error: `No payment address configured for ${chain}`,
        };
      }

      // For USDC transfers, check the logs (ERC20 Transfer event)
      const expectedToken = this.usdcAddresses[chain as keyof typeof this.usdcAddresses];
      const transferEvent = receipt.logs.find(log => {
        // Transfer event signature: Transfer(address,address,uint256)
        if (log.topics[0] !== '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef') {
          return false;
        }

        // Check if it's from the USDC contract
        if (log.address.toLowerCase() !== expectedToken.toLowerCase()) {
          return false;
        }

        // Check if recipient matches
        const recipient = ('0x' + log.topics[2]!.slice(26)) as Address;
        if (recipient.toLowerCase() !== expectedTo.toLowerCase()) {
          return false;
        }

        return true;
      });

      if (!transferEvent) {
        return {
          valid: false,
          error: 'No valid USDC transfer found in transaction',
        };
      }

      // Parse transfer amount (USDC has 6 decimals)
      const amountTransferred = BigInt(transferEvent.data);

      // Validate expected amount range (prevent extreme values)
      if (expectedAmount <= 0 || expectedAmount > 1000000) {
        logger.warn('Invalid expected amount', { expectedAmount });
        return {
          valid: false,
          error: `Invalid expected amount: ${expectedAmount} (must be between 0 and 1,000,000 USD)`,
        };
      }

      // Convert expected amount to BigInt safely
      // Use toFixed to prevent scientific notation (e.g., 1e-9)
      const expectedAmountFixed = Number(expectedAmount).toFixed(6);
      const expectedAmountBigInt = parseUnits(expectedAmountFixed, 6);

      // Check if amount is sufficient (allow 5% tolerance)
      // Use subtraction instead of multiplication to avoid overflow
      const minAcceptable = expectedAmountBigInt - (expectedAmountBigInt / BigInt(20)); // 95% = 100% - 5%

      // Log verification details
      logger.debug('Payment amount verification', {
        expectedAmount: expectedAmountFixed,
        expectedAmountBigInt: expectedAmountBigInt.toString(),
        minAcceptable: minAcceptable.toString(),
        amountTransferred: amountTransferred.toString(),
        txHash: proof.txHash,
      });

      if (amountTransferred < minAcceptable) {
        logger.warn('Insufficient payment amount', {
          sent: amountTransferred.toString(),
          expected: expectedAmountBigInt.toString(),
          minAcceptable: minAcceptable.toString(),
          txHash: proof.txHash,
        });
        return {
          valid: false,
          error: `Insufficient payment: sent ${formatUnits(amountTransferred, 6)} USDC, expected at least ${formatUnits(minAcceptable, 6)} USDC`,
        };
      }

      // Verification successful
      const result: VerificationResult = {
        valid: true,
        txHash: proof.txHash,
        amountPaid: amountTransferred,
        from: tx.from,
        to: expectedTo,
      };

      // Cache result
      this.setCache(cacheKey, result);

      return result;
    } catch (error: any) {
      console.error('Payment verification error:', error);
      return {
        valid: false,
        error: `Verification failed: ${error.message}`,
      };
    }
  }

  /**
   * Cache helpers
   */
  private getFromCache(key: string): VerificationResult | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    return cached;
  }

  private setCache(key: string, result: VerificationResult): void {
    this.cache.set(key, result);

    // Auto-cleanup after TTL
    setTimeout(() => {
      this.cache.delete(key);
    }, this.cacheTTL);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Export singleton instance
export const paymentVerification = new PaymentVerificationService();
