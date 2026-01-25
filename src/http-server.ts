/**
 * x402 HTTP API Server
 *
 * HTTP 服务器主入口 - 支持 HTTP 402 Payment Required 协议
 * 为 x402scan 提供可发现的 API 端点
 */

import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { AIAgentDataService } from './data-service.js';
import { X402PaymentService } from './payment-service.js';
import { PricingService } from './pricing-config.js';

const app: FastifyInstance = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info'
  },
  requestIdHeader: 'x-request-id',
  trustProxy: true
});

// 初始化服务
const dataService = new AIAgentDataService();
const paymentService = new X402PaymentService();
const pricingService = new PricingService();

// ====================
// Plugins
// ====================

// CORS - 允许所有来源
await app.register(cors, {
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Payment-Proof', 'X-Payment-Network', 'Authorization']
});

// Rate Limiting - 基础速率限制
await app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
  errorResponseBuilder: () => ({
    statusCode: 429,
    error: 'Too Many Requests',
    message: 'Rate limit exceeded. Please try again later.'
  })
});

// ====================
// x402 认证中间件
// ====================

interface X402Request extends FastifyRequest {
  x402Verified?: boolean;
  x402PaymentInfo?: any;
}

/**
 * x402 支付验证钩子
 * Phase 1: 简化版本 - 检查 header 但不验证
 * Phase 3: 将实现真实的链上验证
 */
app.addHook('preHandler', async (request: X402Request, reply: FastifyReply) => {
  // 跳过特殊路由
  if (request.url === '/health' || request.url === '/.well-known/x402.json') {
    return;
  }

  // 只处理 /api/* 路由
  if (!request.url.startsWith('/api/')) {
    return;
  }

  const paymentProof = request.headers['x-payment-proof'] as string | undefined;
  const paymentNetwork = request.headers['x-payment-network'] as string | undefined;

  // 如果没有支付证明，返回 402
  if (!paymentProof) {
    const toolName = extractToolName(request.url);
    const pricing = pricingService.calculateToolPrice(toolName, 'free');

    reply.code(402).header('Content-Type', 'application/json').send({
      error: {
        code: 'payment_required',
        message: `Payment of ${pricing.amountUsd} USD required to access this endpoint`,
        price_usd: pricing.amountUsd
      },
      payment: {
        methods: ['x402'],
        networks: [
          {
            network: 'eip155:8453', // Base
            asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC
            amount: (pricing.amountUsd * 1_000_000).toString(), // 转换为 USDC 最小单位
            recipient: process.env.X402_PAYMENT_ADDRESS_BASE || '0x0000000000000000000000000000000000000000'
          },
          {
            network: 'eip155:1', // Ethereum
            asset: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
            amount: (pricing.amountUsd * 1_000_000).toString(),
            recipient: process.env.X402_PAYMENT_ADDRESS_ETH || '0x0000000000000000000000000000000000000000'
          }
        ]
      },
      instructions: {
        step_1: 'Send payment to the recipient address on the specified network',
        step_2: 'Include the transaction hash in the X-Payment-Proof header',
        step_3: 'Include the network identifier in the X-Payment-Network header (e.g., eip155:8453)',
        step_4: 'Retry the request with payment proof headers'
      },
      documentation: 'https://beijiang987.github.io/x402-mcp-server/api.html'
    });
    return;
  }

  // Phase 1: 简化验证 - 只检查是否有 header
  // 任何非空的 payment proof 都会被接受
  app.log.info({ paymentProof, paymentNetwork }, 'Payment proof received (Phase 1 - not verified)');
  request.x402Verified = true;
  request.x402PaymentInfo = { proof: paymentProof, network: paymentNetwork };

  // Phase 3 TODO: 实现真实的链上验证
  // const verification = await paymentService.verifyPayment(paymentProof, {
  //   expectedAmount: pricing.amountUsd,
  //   expectedNetwork: paymentNetwork || 'eip155:8453'
  // });
  // if (!verification.valid) {
  //   return reply.code(402).send({ error: 'Invalid payment proof' });
  // }
});

// ====================
// Helper Functions
// ====================

function extractToolName(url: string): string {
  if (url.includes('/token-price')) return 'get_token_price';
  if (url.includes('/multichain-price')) return 'get_multichain_price';
  if (url.includes('/pool-analytics')) return 'get_pool_analytics';
  if (url.includes('/whale-transactions')) return 'get_whale_transactions';
  if (url.includes('/contract-safety')) return 'scan_contract_safety';
  return 'get_token_price';
}

function buildSuccessResponse(data: any, meta: any = {}) {
  return {
    success: true,
    data,
    meta: {
      timestamp: Date.now(),
      cached: false,
      payment_verified: true,
      ...meta
    }
  };
}

function buildErrorResponse(error: string, details?: any) {
  return {
    success: false,
    error: {
      message: error,
      details
    },
    meta: {
      timestamp: Date.now()
    }
  };
}

// ====================
// API Routes
// ====================

/**
 * GET /api/token-price
 * 获取实时代币价格
 */
app.get('/api/token-price', {
  schema: {
    querystring: {
      type: 'object',
      required: ['token_address'],
      properties: {
        token_address: { type: 'string', description: 'Token contract address' },
        chain: {
          type: 'string',
          enum: ['ethereum', 'base', 'polygon', 'arbitrum', 'optimism'],
          default: 'ethereum'
        }
      }
    }
  }
}, async (request, reply) => {
  try {
    const { token_address, chain = 'ethereum' } = request.query as { token_address: string, chain?: string };
    const result = await dataService.getTokenPrice(token_address, chain);

    return buildSuccessResponse(result);
  } catch (error: any) {
    app.log.error(error);
    return reply.code(500).send(buildErrorResponse(error.message));
  }
});

/**
 * GET /api/multichain-price
 * 跨链价格聚合
 */
app.get('/api/multichain-price', {
  schema: {
    querystring: {
      type: 'object',
      required: ['token_symbol'],
      properties: {
        token_symbol: { type: 'string', description: 'Token symbol (e.g., WETH, USDC)' },
        chains: {
          type: 'string',
          description: 'Comma-separated chain names',
          default: 'ethereum,base,polygon,arbitrum,optimism'
        }
      }
    }
  }
}, async (request, reply) => {
  try {
    const { token_symbol, chains = 'ethereum,base,polygon,arbitrum,optimism' } = request.query as { token_symbol: string, chains?: string };
    const chainArray = chains.split(',');
    const result = await dataService.getMultiChainPrice(token_symbol, chainArray);

    return buildSuccessResponse(result);
  } catch (error: any) {
    app.log.error(error);
    return reply.code(500).send(buildErrorResponse(error.message));
  }
});

/**
 * GET /api/pool-analytics
 * 流动池分析
 */
app.get('/api/pool-analytics', {
  schema: {
    querystring: {
      type: 'object',
      required: ['pool_address'],
      properties: {
        pool_address: { type: 'string', description: 'Liquidity pool contract address' },
        chain: {
          type: 'string',
          enum: ['ethereum', 'base', 'polygon', 'arbitrum', 'optimism'],
          default: 'ethereum'
        }
      }
    }
  }
}, async (request, reply) => {
  try {
    const { pool_address, chain = 'ethereum' } = request.query as { pool_address: string, chain?: string };
    const result = await dataService.getPoolAnalytics(pool_address, chain);

    return buildSuccessResponse(result);
  } catch (error: any) {
    app.log.error(error);
    return reply.code(500).send(buildErrorResponse(error.message));
  }
});

/**
 * GET /api/whale-transactions
 * 巨鲸交易监控
 */
app.get('/api/whale-transactions', {
  schema: {
    querystring: {
      type: 'object',
      required: ['token_address'],
      properties: {
        token_address: { type: 'string', description: 'Token contract address' },
        chain: {
          type: 'string',
          enum: ['ethereum', 'base', 'polygon', 'arbitrum', 'optimism'],
          default: 'ethereum'
        },
        min_value_usd: {
          type: 'number',
          description: 'Minimum transaction value in USD',
          default: 100000
        }
      }
    }
  }
}, async (request, reply) => {
  try {
    const { token_address, chain = 'ethereum', min_value_usd = 100000 } = request.query as {
      token_address: string,
      chain?: string,
      min_value_usd?: number
    };
    const result = await dataService.getWhaleTransactions(token_address, chain, min_value_usd);

    return buildSuccessResponse(result);
  } catch (error: any) {
    app.log.error(error);
    return reply.code(500).send(buildErrorResponse(error.message));
  }
});

/**
 * GET /api/contract-safety
 * 合约安全扫描
 */
app.get('/api/contract-safety', {
  schema: {
    querystring: {
      type: 'object',
      required: ['contract_address'],
      properties: {
        contract_address: { type: 'string', description: 'Contract address to scan' },
        chain: {
          type: 'string',
          enum: ['ethereum', 'base', 'polygon', 'arbitrum', 'optimism'],
          default: 'ethereum'
        }
      }
    }
  }
}, async (request, reply) => {
  try {
    const { contract_address, chain = 'ethereum' } = request.query as { contract_address: string, chain?: string };
    const result = await dataService.scanContractSafety(contract_address, chain);

    return buildSuccessResponse(result);
  } catch (error: any) {
    app.log.error(error);
    return reply.code(500).send(buildErrorResponse(error.message));
  }
});

// ====================
// Utility Routes
// ====================

/**
 * GET /health
 * 健康检查端点
 */
app.get('/health', async () => {
  return {
    status: 'ok',
    timestamp: Date.now(),
    service: 'x402-mcp-server',
    version: '1.0.0'
  };
});

/**
 * GET /.well-known/x402.json
 * x402 服务发现文档（代理到静态文件）
 */
app.get('/.well-known/x402.json', async (request, reply) => {
  reply.header('Content-Type', 'application/json');
  // 在 Vercel 部署时，这个路由会被静态文件覆盖
  // 但在本地测试时，我们需要提供响应
  return {
    version: '2.0',
    service: {
      name: 'x402 AI Agent Data Service',
      url: process.env.SERVICE_URL || 'http://localhost:3000'
    }
  };
});

// ====================
// Error Handlers
// ====================

app.setErrorHandler((error, request, reply) => {
  app.log.error(error);

  const statusCode = error.statusCode || 500;
  reply.code(statusCode).send({
    success: false,
    error: {
      code: error.code || 'INTERNAL_SERVER_ERROR',
      message: error.message || 'An unexpected error occurred'
    },
    meta: {
      timestamp: Date.now()
    }
  });
});

// ====================
// Server Start
// ====================

const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3000');
    const host = process.env.HOST || '0.0.0.0';

    await app.listen({ port, host });

    console.log(`
╔═══════════════════════════════════════════════════════╗
║   🚀 x402 HTTP API Server Started                    ║
╠═══════════════════════════════════════════════════════╣
║   Server:  http://${host}:${port}                    ║
║   Health:  http://${host}:${port}/health             ║
║   Docs:    http://${host}:${port}/.well-known/x402.json ║
╠═══════════════════════════════════════════════════════╣
║   API Endpoints:                                      ║
║   • GET /api/token-price                              ║
║   • GET /api/multichain-price                         ║
║   • GET /api/pool-analytics                           ║
║   • GET /api/whale-transactions                       ║
║   • GET /api/contract-safety                          ║
╚═══════════════════════════════════════════════════════╝
    `);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

// 仅在直接运行时启动服务器
// Vercel serverless 函数将导出 app 实例
if (import.meta.url === `file://${process.argv[1]}`) {
  start();
}

export default app;
