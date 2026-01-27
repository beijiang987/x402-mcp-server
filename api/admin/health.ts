/**
 * 健康检查和配置验证端点
 * 显示系统状态和环境变量配置情况
 */

import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 检查环境变量配置
    const envStatus = {
      // 必需的变量
      KV_URL: process.env.KV_REST_API_URL ? '✓ configured' : '✗ missing',
      KV_TOKEN: process.env.KV_REST_API_TOKEN ? '✓ configured' : '✗ missing',

      // 支付配置
      PAYMENT_ADDRESS_BASE: process.env.X402_PAYMENT_ADDRESS_BASE ? '✓ configured' : '⚠ using default',
      PAYMENT_ADDRESS_ETH: process.env.X402_PAYMENT_ADDRESS_ETH ? '✓ configured' : '⚠ using default',

      // RPC 配置
      RPC_BASE: process.env.RPC_BASE ? '✓ configured' : '⚠ using default',
      RPC_ETH: process.env.RPC_ETH ? '✓ configured' : '⚠ using default',

      // API 密钥（推荐配置）
      ETHERSCAN_API_KEY: process.env.ETHERSCAN_API_KEY ? '✓ configured' : '⚠ recommended',
      BASESCAN_API_KEY: process.env.BASESCAN_API_KEY ? '✓ configured' : '⚠ recommended',
      POLYGONSCAN_API_KEY: process.env.POLYGONSCAN_API_KEY ? '✓ configured' : '○ optional',
      ARBISCAN_API_KEY: process.env.ARBISCAN_API_KEY ? '✓ configured' : '○ optional',

      // 可选配置
      POSTGRES_URL: process.env.POSTGRES_URL ? '✓ configured' : '○ optional',
      COINGECKO_API_KEY: process.env.COINGECKO_API_KEY ? '✓ configured' : '○ optional (free tier ok)',
      GOPLUS_API_KEY: process.env.GOPLUS_API_KEY ? '✓ configured' : '○ optional',
    };

    // 统计配置状态
    const stats = {
      required: 0,
      configured: 0,
      missing: 0,
      recommended: 0,
      optional: 0,
    };

    Object.values(envStatus).forEach((status) => {
      if (status.includes('✓')) {
        stats.configured++;
      } else if (status.includes('✗')) {
        stats.missing++;
        stats.required++;
      } else if (status.includes('⚠')) {
        stats.recommended++;
      } else if (status.includes('○')) {
        stats.optional++;
      }
    });

    // 健康状态判断
    const isHealthy = stats.missing === 0;
    const hasRecommended = stats.recommended === 0;

    return res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? (hasRecommended ? 'healthy' : 'healthy-warnings') : 'unhealthy',
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV || 'production',
        VERCEL: process.env.VERCEL || 'false',
        VERCEL_ENV: process.env.VERCEL_ENV || 'unknown',
      },
      configuration: envStatus,
      summary: {
        total: Object.keys(envStatus).length,
        configured: stats.configured,
        missing: stats.missing,
        recommended_missing: stats.recommended,
        optional_available: Object.values(envStatus).filter(s => s.includes('○')).length - stats.optional,
      },
      recommendations: [
        stats.missing > 0 ? '❌ Critical: Configure missing required variables (KV_URL, KV_TOKEN)' : null,
        !process.env.ETHERSCAN_API_KEY ? '⚠️ Recommended: Add ETHERSCAN_API_KEY for payment verification' : null,
        !process.env.BASESCAN_API_KEY ? '⚠️ Recommended: Add BASESCAN_API_KEY for Base chain support' : null,
        !process.env.POSTGRES_URL ? '💡 Optional: Add POSTGRES_URL for analytics dashboard' : null,
      ].filter(Boolean),
      next_steps: isHealthy ? [
        '1. Configure recommended API keys (ETHERSCAN_API_KEY, BASESCAN_API_KEY)',
        '2. Test payment flow with a small transaction',
        '3. Submit to x402scan for indexing',
      ] : [
        '1. Configure missing required variables in Vercel Dashboard',
        '2. Redeploy the project',
        '3. Check this endpoint again',
      ],
      docs: 'https://github.com/your-repo/x402-mcp-server/blob/main/API_KEYS_SETUP.md',
    });

  } catch (error: any) {
    console.error('Health check failed:', error);
    return res.status(500).json({
      status: 'error',
      error: 'Health check failed',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}
