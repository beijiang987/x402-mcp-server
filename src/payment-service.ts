// import { createFetch } from '@x402/fetch';

export interface PaymentRequest {
  resourcePath: string;
  amount: string;
  currency: string;
  description: string;
  networks: string[];
}

export interface PaymentVerification {
  valid: boolean;
  transactionHash?: string;
  payer?: string;
  amount?: string;
  timestamp?: number;
  error?: string;
}

export interface PaymentStatus {
  confirmed: boolean;
  transactionHash: string;
  network: string;
  blockNumber?: number;
  confirmations?: number;
  error?: string;
}

export interface PaymentConfig {
  path: string;
  amount: string;
  currency: string;
  description: string;
  networks: string[];
}

export class X402PaymentService {
  private static instance: X402PaymentService | null = null;
  private configs: Map<string, PaymentConfig> = new Map();
  private x402Fetch: any;

  // Private constructor to prevent direct instantiation
  private constructor() {
    // Initialize x402 fetch wrapper
    this.initializeX402Fetch();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): X402PaymentService {
    if (!X402PaymentService.instance) {
      X402PaymentService.instance = new X402PaymentService();
    }
    return X402PaymentService.instance;
  }

  private initializeX402Fetch() {
    try {
      // Create x402-enabled fetch client
      // TODO: 实际集成时需要安装 @x402/fetch 包
      // this.x402Fetch = createFetch({
      //   networks: ['base', 'ethereum', 'polygon'],
      //   walletConfig: {
      //     privateKey: process.env.X402_WALLET_PRIVATE_KEY,
      //     rpcUrl: process.env.X402_RPC_URL,
      //   },
      // });
      this.x402Fetch = fetch;
    } catch (error) {
      console.error('Failed to initialize x402 fetch:', error);
      // Fallback to regular fetch if x402 not configured
      this.x402Fetch = fetch;
    }
  }

  async verifyPayment(
    paymentSignature: string,
    resourcePath: string,
    expectedAmount?: string
  ): Promise<PaymentVerification> {
    try {
      // Parse payment signature (typically contains transaction hash, signature, etc.)
      const paymentData = this.parsePaymentSignature(paymentSignature);

      // Verify payment on-chain
      const verified = await this.verifyOnChain(paymentData);

      if (!verified.valid) {
        return {
          valid: false,
          error: 'Payment verification failed on-chain',
        };
      }

      // Check if amount matches expected (if provided)
      if (expectedAmount && verified.amount !== expectedAmount) {
        return {
          valid: false,
          error: `Amount mismatch: expected ${expectedAmount}, got ${verified.amount}`,
        };
      }

      // Store successful payment verification
      this.recordPayment(resourcePath, verified);

      return {
        valid: true,
        transactionHash: verified.transactionHash,
        payer: verified.payer,
        amount: verified.amount,
        timestamp: verified.timestamp,
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async createPaymentRequest(request: PaymentRequest): Promise<any> {
    try {
      // Store payment configuration
      this.configs.set(request.resourcePath, {
        path: request.resourcePath,
        amount: request.amount,
        currency: request.currency,
        description: request.description,
        networks: request.networks,
      });

      // Generate x402 payment headers
      const paymentHeaders = {
        'X-Accept-Payment': request.networks.join(','),
        'X-Payment-Amount': request.amount,
        'X-Payment-Currency': request.currency,
        'X-Payment-Description': request.description,
      };

      // Create 402 Payment Required response structure
      const response = {
        status: 402,
        statusText: 'Payment Required',
        headers: paymentHeaders,
        body: {
          error: 'Payment Required',
          message: `Payment of ${request.amount} ${request.currency} required to access ${request.resourcePath}`,
          payment: {
            amount: request.amount,
            currency: request.currency,
            networks: request.networks,
            description: request.description,
            // Add payment address or smart contract address
            paymentAddress: this.getPaymentAddress(request.networks[0]),
          },
          instructions: {
            step1: 'Sign a payment transaction using one of the supported networks',
            step2: 'Include the payment signature in the X-Payment-Signature header',
            step3: 'Retry the request with the payment proof',
          },
        },
      };

      return response;
    } catch (error) {
      throw new Error(`Failed to create payment request: ${error}`);
    }
  }

  async checkPaymentStatus(
    transactionHash: string,
    network: string
  ): Promise<PaymentStatus> {
    try {
      // In a real implementation, this would query the blockchain
      // For now, we'll return a mock response structure

      // TODO: Implement actual blockchain query using x402 SDK or web3 provider
      const status: PaymentStatus = {
        confirmed: false,
        transactionHash,
        network,
        error: 'Blockchain query not yet implemented. Please configure RPC endpoint.',
      };

      // Example of what real implementation might look like:
      // const provider = this.getProvider(network);
      // const receipt = await provider.getTransactionReceipt(transactionHash);
      // if (receipt && receipt.status === 1) {
      //   status.confirmed = true;
      //   status.blockNumber = receipt.blockNumber;
      //   status.confirmations = await provider.getBlockNumber() - receipt.blockNumber;
      // }

      return status;
    } catch (error) {
      return {
        confirmed: false,
        transactionHash,
        network,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async listPaymentConfigs(): Promise<PaymentConfig[]> {
    return Array.from(this.configs.values());
  }

  private parsePaymentSignature(signature: string): any {
    try {
      // x402 payment signatures are typically JSON or base64 encoded
      // They contain: transaction hash, signature, network, timestamp, etc.

      // Try parsing as JSON first
      if (signature.startsWith('{')) {
        return JSON.parse(signature);
      }

      // Try base64 decode
      if (this.isBase64(signature)) {
        const decoded = Buffer.from(signature, 'base64').toString('utf-8');
        return JSON.parse(decoded);
      }

      // If it's just a transaction hash
      return {
        transactionHash: signature,
      };
    } catch (error) {
      throw new Error(`Invalid payment signature format: ${error}`);
    }
  }

  private async verifyOnChain(paymentData: any): Promise<any> {
    // TODO: Implement actual on-chain verification
    // This would use the x402 SDK to verify the payment on the blockchain

    // For now, return a mock response
    return {
      valid: true,
      transactionHash: paymentData.transactionHash || 'mock-tx-hash',
      payer: paymentData.payer || '0x0000000000000000000000000000000000000000',
      amount: paymentData.amount || '0',
      timestamp: Date.now(),
    };
  }

  private recordPayment(resourcePath: string, paymentData: any): void {
    // TODO: Store payment records in a database or persistent storage
    // For now, just log it
    console.log(`Payment recorded for ${resourcePath}:`, paymentData);
  }

  private getPaymentAddress(network: string): string {
    // Return payment address for the specified network
    // This would typically come from environment variables or configuration
    const addresses: Record<string, string> = {
      base: process.env.X402_BASE_ADDRESS || '0x...',
      ethereum: process.env.X402_ETH_ADDRESS || '0x...',
      polygon: process.env.X402_POLYGON_ADDRESS || '0x...',
    };

    return addresses[network] || 'ADDRESS_NOT_CONFIGURED';
  }

  private isBase64(str: string): boolean {
    try {
      return Buffer.from(str, 'base64').toString('base64') === str;
    } catch {
      return false;
    }
  }
}
