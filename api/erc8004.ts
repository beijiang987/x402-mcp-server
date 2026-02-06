/**
 * ERC-8004 API 端点
 *
 * 提供 AI Agent 发现、搜索和声誉查询的 HTTP API
 * 高级功能使用 x402 支付保护
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { ERC8004Service } from '../src/erc8004/erc8004-service.js';

// 从环境变量初始化服务
const getService = () => {
  const privateKey = process.env.X402_WALLET_PRIVATE_KEY;
  const network = (process.env.ERC8004_NETWORK || 'sepolia') as
    | 'sepolia'
    | 'mainnet'
    | 'base';
  const rpcUrl = process.env.X402_RPC_URL;

  if (!privateKey) {
    throw new Error('缺少 X402_WALLET_PRIVATE_KEY 环境变量');
  }

  if (!rpcUrl) {
    throw new Error('缺少 X402_RPC_URL 环境变量');
  }

  return new ERC8004Service(privateKey, network, rpcUrl);
};

/**
 * 主路由处理器
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS 设置
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Payment');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { action } = req.query;

    switch (action) {
      case 'search':
        return await handleSearch(req, res);

      case 'trending':
        return await handleTrending(req, res);

      case 'agent':
        return await handleGetAgent(req, res);

      case 'feedbacks':
        return await handleGetFeedbacks(req, res);

      case 'stats':
        return await handleGetStats(req, res);

      case 'register':
        return await handleRegister(req, res);

      case 'submit-feedback':
        return await handleSubmitFeedback(req, res);

      default:
        return res.status(400).json({
          error: '无效的 action 参数',
          validActions: [
            'search',
            'trending',
            'agent',
            'feedbacks',
            'stats',
            'register',
            'submit-feedback',
          ],
        });
    }
  } catch (error: any) {
    console.error('API 错误:', error);
    return res.status(500).json({
      error: '服务器内部错误',
      message: error.message,
    });
  }
}

/**
 * 搜索 Agents（免费基础功能）
 */
async function handleSearch(req: VercelRequest, res: VercelResponse) {
  const { keyword, first = '20', skip = '0' } = req.query;

  const service = getService();
  const agents = await service.searchAgents({
    keyword: keyword as string,
    first: parseInt(first as string, 10),
    skip: parseInt(skip as string, 10),
  });

  return res.status(200).json({
    success: true,
    count: agents.length,
    agents,
  });
}

/**
 * 获取热门 Agents（免费）
 */
async function handleTrending(req: VercelRequest, res: VercelResponse) {
  const { limit = '10' } = req.query;

  const service = getService();
  const agents = await service.getTrendingAgents(parseInt(limit as string, 10));

  return res.status(200).json({
    success: true,
    count: agents.length,
    agents,
  });
}

/**
 * 获取单个 Agent 详情（免费）
 */
async function handleGetAgent(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: '缺少 id 参数' });
  }

  const service = getService();
  const agent = await service.getAgent(id as string);

  return res.status(200).json({
    success: true,
    agent,
  });
}

/**
 * 获取 Agent 反馈（免费基础查询，高级查询需要支付）
 */
async function handleGetFeedbacks(req: VercelRequest, res: VercelResponse) {
  const { agentId, first = '10', skip = '0' } = req.query;

  if (!agentId) {
    return res.status(400).json({ error: '缺少 agentId 参数' });
  }

  // 检查是否请求高级功能（超过 10 条反馈）
  const requestedCount = parseInt(first as string, 10);
  if (requestedCount > 10) {
    // 需要 x402 支付
    const paymentHeader = req.headers['x-payment'] as string;

    if (!paymentHeader) {
      return res.status(402).json({
        error: 'Payment Required',
        message: '获取超过 10 条反馈需要支付',
        paymentRequired: {
          amount: '0.0001',
          currency: 'ETH',
          network: 'base',
          description: `获取 ${requestedCount} 条反馈记录`,
        },
      });
    }

    // TODO: 验证支付
    // const paymentValid = await verifyX402Payment(paymentHeader);
    // if (!paymentValid) {
    //   return res.status(403).json({ error: '支付验证失败' });
    // }
  }

  const service = getService();
  const feedbacks = await service.getAgentFeedbacks(agentId as string, {
    first: requestedCount,
    skip: parseInt(skip as string, 10),
  });

  return res.status(200).json({
    success: true,
    count: feedbacks.length,
    feedbacks,
  });
}

/**
 * 获取平台统计（免费）
 */
async function handleGetStats(req: VercelRequest, res: VercelResponse) {
  const service = getService();
  const stats = await service.getStats();

  return res.status(200).json({
    success: true,
    stats,
  });
}

/**
 * 注册新 Agent（需要链上交易）
 */
async function handleRegister(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '仅支持 POST 请求' });
  }

  const { name, metadata } = req.body;

  if (!name || !metadata) {
    return res.status(400).json({ error: '缺少 name 或 metadata 参数' });
  }

  const service = getService();
  const result = await service.registerAgent(name, metadata);

  return res.status(200).json({
    success: true,
    agentId: result.agentId,
    txHash: result.txHash,
    message: '注册成功，请等待交易确认',
  });
}

/**
 * 提交反馈（需要链上交易）
 */
async function handleSubmitFeedback(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '仅支持 POST 请求' });
  }

  const { agentId, rating, comment } = req.body;

  if (!agentId || !rating || !comment) {
    return res.status(400).json({ error: '缺少必要参数' });
  }

  const service = getService();
  const result = await service.submitFeedback(
    agentId,
    parseInt(rating, 10),
    comment
  );

  return res.status(200).json({
    success: true,
    feedbackId: result.feedbackId,
    txHash: result.txHash,
    message: '反馈提交成功',
  });
}
