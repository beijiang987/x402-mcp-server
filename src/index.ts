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
import { ERC8004Service } from './erc8004/erc8004-service.js';
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
  // ========== ERC-8004 AI Agent 身份和声誉管理工具 ==========
  {
    name: 'erc8004_register_agent',
    description: 'Register a new AI agent on-chain with ERC-8004 identity standard',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Agent name',
        },
        description: {
          type: 'string',
          description: 'Agent description',
        },
        capabilities: {
          type: 'array',
          description: 'List of agent capabilities',
          items: { type: 'string' },
        },
        apiEndpoint: {
          type: 'string',
          description: 'Agent API endpoint URL (optional)',
        },
        tags: {
          type: 'array',
          description: 'Tags for categorization (optional)',
          items: { type: 'string' },
        },
      },
      required: ['name', 'description', 'capabilities'],
    },
  },
  {
    name: 'erc8004_search_agents',
    description: 'Search for AI agents by keyword, tags, capabilities, or rating',
    inputSchema: {
      type: 'object',
      properties: {
        keyword: {
          type: 'string',
          description: 'Search keyword (optional)',
        },
        tags: {
          type: 'array',
          description: 'Filter by tags (optional)',
          items: { type: 'string' },
        },
        capabilities: {
          type: 'array',
          description: 'Filter by capabilities (optional)',
          items: { type: 'string' },
        },
        minRating: {
          type: 'number',
          description: 'Minimum average rating (0-5, optional)',
        },
        limit: {
          type: 'number',
          description: 'Maximum results to return',
          default: 20,
        },
      },
    },
  },
  {
    name: 'erc8004_get_agent',
    description: 'Get detailed information about a specific AI agent',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: {
          type: 'string',
          description: 'The agent ID to query',
        },
      },
      required: ['agentId'],
    },
  },
  {
    name: 'erc8004_submit_feedback',
    description: 'Submit feedback/rating for an AI agent',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: {
          type: 'string',
          description: 'The agent ID to rate',
        },
        rating: {
          type: 'number',
          description: 'Rating from 1-5 stars',
        },
        comment: {
          type: 'string',
          description: 'Feedback comment',
        },
      },
      required: ['agentId', 'rating', 'comment'],
    },
  },
  {
    name: 'erc8004_get_trending',
    description: 'Get trending/popular AI agents based on ratings and usage',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Number of agents to return',
          default: 10,
        },
      },
    },
  },
  {
    name: 'erc8004_get_stats',
    description: 'Get platform statistics (total agents, feedbacks, average rating)',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

class X402MCPServer {
  private server: Server;
  private paymentService: X402PaymentService;
  private dataService: DataService;
  private erc8004Service: ERC8004Service | null = null;

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

    // 初始化 ERC8004 服务（如果配置了私钥）
    try {
      const privateKey = process.env.X402_WALLET_PRIVATE_KEY;
      const network = (process.env.ERC8004_NETWORK || 'sepolia') as 'sepolia' | 'mainnet' | 'base';
      const rpcUrl = process.env.X402_RPC_URL;

      if (privateKey) {
        this.erc8004Service = new ERC8004Service(privateKey, network, rpcUrl);
        logger.info('ERC8004 服务已初始化');
      } else {
        logger.warn('未配置 X402_WALLET_PRIVATE_KEY，ERC8004 功能将不可用');
      }
    } catch (error) {
      logger.error('初始化 ERC8004 服务失败', { error });
    }

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

          // ========== ERC-8004 工具 ==========
          case 'erc8004_register_agent': {
            if (!this.erc8004Service) {
              throw new Error('ERC8004 服务未初始化，请配置 X402_WALLET_PRIVATE_KEY');
            }

            const metadata = {
              name: args.name as string,
              description: args.description as string,
              capabilities: args.capabilities as string[],
              apiEndpoint: args.apiEndpoint as string | undefined,
              tags: args.tags as string[] | undefined,
            };

            const result = await this.erc8004Service.registerAgent(
              args.name as string,
              metadata
            );

            return {
              content: [
                {
                  type: 'text',
                  text: `✅ Agent 注册成功！\n\nAgent ID: ${result.agentId}\n交易哈希: ${result.txHash}\n\n请等待交易确认后，您的 agent 将在链上可见。`,
                },
              ],
            };
          }

          case 'erc8004_search_agents': {
            if (!this.erc8004Service) {
              throw new Error('ERC8004 服务未初始化');
            }

            const result = await this.erc8004Service.searchAgents({
              keyword: args.keyword as string | undefined,
              tags: args.tags as string[] | undefined,
              capabilities: args.capabilities as string[] | undefined,
              minRating: args.minRating as number | undefined,
              first: (args.limit as number) || 20,
            });

            return {
              content: [
                {
                  type: 'text',
                  text: `找到 ${result.length} 个 AI Agents:\n\n${JSON.stringify(result, null, 2)}`,
                },
              ],
            };
          }

          case 'erc8004_get_agent': {
            if (!this.erc8004Service) {
              throw new Error('ERC8004 服务未初始化');
            }

            const result = await this.erc8004Service.getAgent(
              args.agentId as string
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

          case 'erc8004_submit_feedback': {
            if (!this.erc8004Service) {
              throw new Error('ERC8004 服务未初始化');
            }

            const result = await this.erc8004Service.submitFeedback(
              args.agentId as string,
              args.rating as number,
              args.comment as string
            );

            return {
              content: [
                {
                  type: 'text',
                  text: `✅ 反馈提交成功！\n\nFeedback ID: ${result.feedbackId}\n交易哈希: ${result.txHash}`,
                },
              ],
            };
          }

          case 'erc8004_get_trending': {
            if (!this.erc8004Service) {
              throw new Error('ERC8004 服务未初始化');
            }

            const result = await this.erc8004Service.getTrendingAgents(
              (args.limit as number) || 10
            );

            return {
              content: [
                {
                  type: 'text',
                  text: `🔥 热门 AI Agents:\n\n${JSON.stringify(result, null, 2)}`,
                },
              ],
            };
          }

          case 'erc8004_get_stats': {
            if (!this.erc8004Service) {
              throw new Error('ERC8004 服务未初始化');
            }

            const result = await this.erc8004Service.getStats();

            return {
              content: [
                {
                  type: 'text',
                  text: `📊 平台统计:\n\n总 Agents: ${result.totalAgents}\n总反馈数: ${result.totalFeedbacks}\n平均评分: ${result.averageRating.toFixed(2)}/5.0`,
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
