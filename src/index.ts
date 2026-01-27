#!/usr/bin/env node

// Validate environment variables first (will exit if invalid)
import './config/env-validator.js';

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { X402PaymentService } from './payment-service.js';
import { DataService } from './data-service.js';
import { logger } from './utils/logger.js';

// ============================================
// Global Error Handlers
// ============================================

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('❌ Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
  logger.error('Unhandled promise rejection', {
    reason: reason?.message || String(reason),
    stack: reason?.stack,
  });
  // Don't exit the process - log and continue
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  console.error('❌ Uncaught Exception:', error);
  logger.error('Uncaught exception', {
    message: error.message,
    stack: error.stack,
  });
  // For uncaught exceptions, we should exit gracefully
  console.error('Process will exit due to uncaught exception');
  process.exit(1);
});

const TOOLS: Tool[] = [
  {
    name: 'verify_payment',
    description: 'Verify a x402 payment signature and check if payment is valid',
    inputSchema: {
      type: 'object',
      properties: {
        payment_signature: {
          type: 'string',
          description: 'The x402 payment signature to verify',
        },
        expected_amount: {
          type: 'string',
          description: 'Expected payment amount (optional)',
        },
        resource_path: {
          type: 'string',
          description: 'The resource path being accessed',
        },
      },
      required: ['payment_signature', 'resource_path'],
    },
  },
  {
    name: 'create_payment_request',
    description: 'Create a x402 payment request with 402 Payment Required response',
    inputSchema: {
      type: 'object',
      properties: {
        resource_path: {
          type: 'string',
          description: 'The resource path that requires payment',
        },
        amount: {
          type: 'string',
          description: 'Payment amount required',
        },
        currency: {
          type: 'string',
          description: 'Currency or token symbol (e.g., ETH, USDC)',
          default: 'ETH',
        },
        description: {
          type: 'string',
          description: 'Description of the paid resource',
        },
        networks: {
          type: 'array',
          description: 'Supported blockchain networks',
          items: { type: 'string' },
          default: ['base', 'ethereum'],
        },
      },
      required: ['resource_path', 'amount', 'description'],
    },
  },
  {
    name: 'check_payment_status',
    description: 'Check the status of a x402 payment transaction',
    inputSchema: {
      type: 'object',
      properties: {
        transaction_hash: {
          type: 'string',
          description: 'The blockchain transaction hash',
        },
        network: {
          type: 'string',
          description: 'The blockchain network (e.g., base, ethereum)',
          default: 'base',
        },
      },
      required: ['transaction_hash'],
    },
  },
  {
    name: 'list_payment_configs',
    description: 'List all configured payment endpoints and their requirements',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  // ========== AI Agent 数据服务工具 ==========
  {
    name: 'get_token_price',
    description: 'Get real-time token price data from DEX (supports multiple chains)',
    inputSchema: {
      type: 'object',
      properties: {
        token_address: {
          type: 'string',
          description: 'Token contract address',
        },
        chain: {
          type: 'string',
          description: 'Blockchain network (ethereum, base, polygon, arbitrum, optimism)',
          default: 'ethereum',
        },
      },
      required: ['token_address'],
    },
  },
  {
    name: 'get_multichain_price',
    description: 'Get token prices across multiple chains and identify arbitrage opportunities',
    inputSchema: {
      type: 'object',
      properties: {
        token_symbol: {
          type: 'string',
          description: 'Token symbol (e.g., USDC, WETH, USDT)',
        },
        chains: {
          type: 'array',
          description: 'List of chains to check',
          items: { type: 'string' },
          default: ['ethereum', 'base', 'polygon'],
        },
      },
      required: ['token_symbol'],
    },
  },
  {
    name: 'get_pool_analytics',
    description: 'Get detailed analytics for a liquidity pool (TVL, APY, volume, fees)',
    inputSchema: {
      type: 'object',
      properties: {
        pool_address: {
          type: 'string',
          description: 'Liquidity pool contract address',
        },
        chain: {
          type: 'string',
          description: 'Blockchain network',
          default: 'ethereum',
        },
      },
      required: ['pool_address'],
    },
  },
  {
    name: 'get_whale_transactions',
    description: 'Monitor large transactions (whale activity) for a specific token',
    inputSchema: {
      type: 'object',
      properties: {
        token_address: {
          type: 'string',
          description: 'Token contract address to monitor',
        },
        chain: {
          type: 'string',
          description: 'Blockchain network',
          default: 'ethereum',
        },
        min_amount_usd: {
          type: 'number',
          description: 'Minimum transaction amount in USD to track',
          default: 100000,
        },
        limit: {
          type: 'number',
          description: 'Maximum number of transactions to return',
          default: 10,
        },
      },
      required: ['token_address'],
    },
  },
  {
    name: 'scan_contract_safety',
    description: 'Scan a smart contract for security risks and safety issues',
    inputSchema: {
      type: 'object',
      properties: {
        contract_address: {
          type: 'string',
          description: 'Smart contract address to scan',
        },
        chain: {
          type: 'string',
          description: 'Blockchain network',
          default: 'ethereum',
        },
      },
      required: ['contract_address'],
    },
  },
];

class X402MCPServer {
  private server: Server;
  private paymentService: X402PaymentService;
  private dataService: DataService;

  constructor() {
    this.server = new Server(
      {
        name: 'x402-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Use singleton instances
    this.paymentService = X402PaymentService.getInstance();
    this.dataService = new DataService();
    this.setupToolHandlers();

    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: TOOLS,
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;

        if (!args) {
          throw new Error('Missing arguments');
        }

        switch (name) {
          case 'verify_payment': {
            const result = await this.paymentService.verifyPayment(
              args.payment_signature as string,
              args.resource_path as string,
              args.expected_amount as string | undefined
            );
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case 'create_payment_request': {
            const result = await this.paymentService.createPaymentRequest({
              resourcePath: args.resource_path as string,
              amount: args.amount as string,
              currency: (args.currency as string) || 'ETH',
              description: args.description as string,
              networks: (args.networks as string[]) || ['base', 'ethereum'],
            });
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case 'check_payment_status': {
            const result = await this.paymentService.checkPaymentStatus(
              args.transaction_hash as string,
              (args.network as string) || 'base'
            );
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case 'list_payment_configs': {
            const result = await this.paymentService.listPaymentConfigs();
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          // ========== 数据服务工具 ==========
          case 'get_token_price': {
            const result = await this.dataService.getTokenPrice(
              args.token_address as string,
              (args.chain as string) || 'ethereum'
            );
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case 'get_multichain_price': {
            const result = await this.dataService.getMultiChainPrice(
              args.token_symbol as string,
              (args.chains as string[]) || ['ethereum', 'base', 'polygon']
            );
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case 'get_pool_analytics': {
            const result = await this.dataService.getPoolAnalytics(
              args.pool_address as string,
              (args.chain as string) || 'ethereum'
            );
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case 'get_whale_transactions': {
            const result = await this.dataService.getWhaleTransactions(
              args.token_address as string,
              (args.chain as string) || 'ethereum',
              (args.min_amount_usd as number) || 100000,
              (args.limit as number) || 10
            );
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case 'scan_contract_safety': {
            const result = await this.dataService.scanContractSafety(
              args.contract_address as string,
              (args.chain as string) || 'ethereum'
            );
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('x402 MCP server running on stdio');
  }
}

const server = new X402MCPServer();
server.run().catch(console.error);
