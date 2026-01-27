/**
 * Environment Variable Validator
 *
 * Validates all required environment variables on application startup
 * Provides clear error messages for missing or invalid configuration
 */

import { logger } from '../utils/logger.js';

export interface EnvValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Environment Configuration Manager
 */
export class EnvValidator {
  /**
   * Get required environment variable
   * Throws if missing
   */
  static getRequired(key: string): string {
    const value = process.env[key];
    if (!value || value.trim() === '') {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
  }

  /**
   * Get optional environment variable with default
   */
  static getOptional(key: string, defaultValue: string): string {
    const value = process.env[key];
    return value && value.trim() !== '' ? value : defaultValue;
  }

  /**
   * Validate URL format
   */
  static validateUrl(url: string, name: string): void {
    try {
      const parsed = new URL(url);
      if (!parsed.protocol.startsWith('http')) {
        throw new Error(`${name} must use HTTP or HTTPS protocol`);
      }
    } catch (error) {
      throw new Error(`Invalid URL for ${name}: ${url}`);
    }
  }

  /**
   * Validate Ethereum address format
   */
  static validateEthereumAddress(address: string, name: string): void {
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      throw new Error(`Invalid Ethereum address for ${name}: ${address}`);
    }
  }

  /**
   * Validate all environment variables
   * Call this on application startup
   */
  static validate(): EnvValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    console.log('🔍 Validating environment variables...\n');

    // ========== Required Variables ==========

    // Vercel KV (Redis) - Required for rate limiting
    try {
      const kvUrl = this.getRequired('KV_REST_API_URL');
      this.validateUrl(kvUrl, 'KV_REST_API_URL');
      console.log('✓ KV_REST_API_URL');
    } catch (error: any) {
      errors.push(error.message);
      console.error(`✗ KV_REST_API_URL: ${error.message}`);
    }

    try {
      this.getRequired('KV_REST_API_TOKEN');
      console.log('✓ KV_REST_API_TOKEN');
    } catch (error: any) {
      errors.push(error.message);
      console.error(`✗ KV_REST_API_TOKEN: ${error.message}`);
    }

    // x402 Payment Addresses
    try {
      const addressBase = this.getRequired('X402_PAYMENT_ADDRESS_BASE');
      this.validateEthereumAddress(addressBase, 'X402_PAYMENT_ADDRESS_BASE');
      console.log('✓ X402_PAYMENT_ADDRESS_BASE');
    } catch (error: any) {
      errors.push(error.message);
      console.error(`✗ X402_PAYMENT_ADDRESS_BASE: ${error.message}`);
    }

    try {
      const addressEth = this.getRequired('X402_PAYMENT_ADDRESS_ETH');
      this.validateEthereumAddress(addressEth, 'X402_PAYMENT_ADDRESS_ETH');
      console.log('✓ X402_PAYMENT_ADDRESS_ETH');
    } catch (error: any) {
      errors.push(error.message);
      console.error(`✗ X402_PAYMENT_ADDRESS_ETH: ${error.message}`);
    }

    // RPC URLs
    try {
      const rpcBase = this.getRequired('RPC_BASE');
      this.validateUrl(rpcBase, 'RPC_BASE');
      console.log('✓ RPC_BASE');
    } catch (error: any) {
      errors.push(error.message);
      console.error(`✗ RPC_BASE: ${error.message}`);
    }

    try {
      const rpcEth = this.getRequired('RPC_ETH');
      this.validateUrl(rpcEth, 'RPC_ETH');
      console.log('✓ RPC_ETH');
    } catch (error: any) {
      errors.push(error.message);
      console.error(`✗ RPC_ETH: ${error.message}`);
    }

    // ========== Optional Variables ==========

    // Vercel Postgres (optional)
    const postgresUrl = process.env.POSTGRES_URL;
    if (postgresUrl) {
      try {
        this.validateUrl(postgresUrl, 'POSTGRES_URL');
        console.log('✓ POSTGRES_URL (optional)');
      } catch (error: any) {
        warnings.push(`Invalid POSTGRES_URL: ${error.message}`);
        console.warn(`⚠ POSTGRES_URL: ${error.message}`);
      }
    } else {
      console.log('⊘ POSTGRES_URL (not configured - stats disabled)');
    }

    // API Keys (optional but recommended)
    const coingeckoKey = process.env.COINGECKO_API_KEY;
    if (!coingeckoKey) {
      warnings.push('COINGECKO_API_KEY not set - using free tier (rate limited)');
      console.warn('⚠ COINGECKO_API_KEY not set - using free tier');
    } else {
      console.log('✓ COINGECKO_API_KEY (optional)');
    }

    const etherscanKey = process.env.ETHERSCAN_API_KEY;
    if (!etherscanKey) {
      warnings.push('ETHERSCAN_API_KEY not set - recommended for payment verification');
      console.warn('⚠ ETHERSCAN_API_KEY not set - recommended');
    } else {
      console.log('✓ ETHERSCAN_API_KEY (optional)');
    }

    const goplusKey = process.env.GOPLUS_API_KEY;
    if (!goplusKey) {
      console.log('⊘ GOPLUS_API_KEY (not configured - using public endpoint)');
    } else {
      console.log('✓ GOPLUS_API_KEY (optional)');
    }

    // IP Salt (optional but recommended)
    const ipSalt = process.env.IP_SALT;
    if (!ipSalt || ipSalt === 'your_random_salt_here') {
      warnings.push('IP_SALT not set or using default - consider setting a random value');
      console.warn('⚠ IP_SALT using default - consider setting unique value');
    } else {
      console.log('✓ IP_SALT');
    }

    // ========== Summary ==========

    console.log('\n' + '='.repeat(50));

    const valid = errors.length === 0;

    if (valid) {
      console.log('✅ Environment validation PASSED');
      if (warnings.length > 0) {
        console.log(`⚠️  ${warnings.length} warning(s) - see above`);
      }
    } else {
      console.error(`❌ Environment validation FAILED with ${errors.length} error(s)`);
      errors.forEach((err) => console.error(`  - ${err}`));
    }

    console.log('='.repeat(50) + '\n');

    return { valid, errors, warnings };
  }

  /**
   * Get validated configuration
   * Only call after validate() passes
   */
  static getConfig() {
    return {
      // Redis
      kvUrl: this.getRequired('KV_REST_API_URL'),
      kvToken: this.getRequired('KV_REST_API_TOKEN'),

      // Payment
      paymentAddressBase: this.getRequired('X402_PAYMENT_ADDRESS_BASE'),
      paymentAddressEth: this.getRequired('X402_PAYMENT_ADDRESS_ETH'),

      // RPC
      rpcBase: this.getRequired('RPC_BASE'),
      rpcEth: this.getRequired('RPC_ETH'),

      // Optional
      postgresUrl: process.env.POSTGRES_URL,
      coingeckoApiKey: process.env.COINGECKO_API_KEY,
      etherscanApiKey: process.env.ETHERSCAN_API_KEY,
      goplusApiKey: process.env.GOPLUS_API_KEY,
      ipSalt: this.getOptional('IP_SALT', 'x402'),

      // Service config
      port: parseInt(this.getOptional('PORT', '3000')),
      logLevel: this.getOptional('LOG_LEVEL', 'INFO'),
      cacheTTL: parseInt(this.getOptional('CACHE_TTL', '30')),
      rateLimitFreeDaily: parseInt(this.getOptional('RATE_LIMIT_FREE_DAILY', '10')),
      rateLimitPaidPerMinute: parseInt(this.getOptional('RATE_LIMIT_PAID_PER_MINUTE', '60')),
    };
  }
}

// Validate on module load (for immediate feedback)
if (process.env.NODE_ENV !== 'test') {
  const result = EnvValidator.validate();
  if (!result.valid) {
    console.error('\n❌ Application cannot start due to invalid environment configuration');
    console.error('Please check .env file and fix the errors above\n');
    process.exit(1);
  }
}
