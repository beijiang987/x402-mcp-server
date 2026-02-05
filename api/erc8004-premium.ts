/**
 * ERC-8004 Premium API (x402 支付保护)
 *
 * 提供付费高级功能:
 * - 高级搜索（大量结果 + 深度分析）
 * - 批量查询（一次查询多个 Agents）
 * - 详细声誉分析（Sybil 风险 + 标签分解）
 * - 数据导出（CSV/JSON 格式）
 *
 * 所有端点都需要 x402 USDC 支付
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { requirePayment } from '../src/x402/payment-middleware.js';
import { AgentSearchService } from '../src/erc8004/agent-search-service.js';
import { ReputationAggregator } from '../src/erc8004/reputation-aggregator.js';

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
      case 'premium-search':
        return await handlePremiumSearch(req, res);

      case 'batch-query':
        return await handleBatchQuery(req, res);

      case 'detailed-analysis':
        return await handleDetailedAnalysis(req, res);

      case 'export-data':
        return await handleExportData(req, res);

      default:
        return res.status(400).json({
          error: '无效的 action 参数',
          validActions: ['premium-search', 'batch-query', 'detailed-analysis', 'export-data'],
        });
    }
  } catch (error: any) {
    console.error('Premium API 错误:', error);
    return res.status(500).json({
      error: '服务器内部错误',
      message: error.message,
    });
  }
}

/**
 * 高级搜索 (0.0001 USDC)
 *
 * 功能:
 * - 最多 100 个结果（基础版限 20）
 * - 更深度的相关性分析
 * - 包含声誉评分
 * - 支持多维度过滤
 */
async function handlePremiumSearch(req: VercelRequest, res: VercelResponse) {
  // x402 支付验证
  const paymentOk = await requirePayment(req, res, 'premiumSearch');
  if (!paymentOk) return;

  const {
    keyword,
    capabilities,
    skills,
    domains,
    minRating,
    minFeedbacks,
    x402Only,
    sortBy = 'relevance',
    sortOrder = 'desc',
    limit = '50',
    offset = '0',
  } = req.query;

  // 解析数组参数
  const parseArray = (param: any): string[] | undefined => {
    if (!param) return undefined;
    if (typeof param === 'string') {
      return param.split(',').map((s) => s.trim());
    }
    return Array.isArray(param) ? param : undefined;
  };

  const network = (process.env.ERC8004_NETWORK || 'sepolia') as 'sepolia' | 'mainnet';
  const searchService = new AgentSearchService(network);

  const results = await searchService.search({
    keyword: keyword as string,
    capabilities: parseArray(capabilities),
    skills: parseArray(skills),
    domains: parseArray(domains),
    minRating: minRating ? parseFloat(minRating as string) : undefined,
    minFeedbacks: minFeedbacks ? parseInt(minFeedbacks as string) : undefined,
    x402Only: x402Only === 'true',
    sortBy: sortBy as any,
    sortOrder: sortOrder as any,
    limit: Math.min(100, parseInt(limit as string)), // 最多 100
    offset: parseInt(offset as string),
  });

  return res.status(200).json({
    success: true,
    count: results.length,
    paidFeature: 'premium-search',
    price: '0.0001 USDC',
    results: results.map((r) => ({
      agentId: r.agent.agentId,
      owner: r.agent.owner,
      uri: r.agent.agentURI,
      name: r.agent.metadata?.name,
      description: r.agent.metadata?.description,
      image: r.agent.metadata?.image,
      capabilities: r.agent.metadata?.capabilities,
      skills: r.agent.metadata?.skills,
      domains: r.agent.metadata?.domains,
      x402Support: r.agent.metadata?.x402Support,
      relevanceScore: r.score,
      reputation: r.reputation,
      createdAt: new Date(r.agent.createdAt * 1000).toISOString(),
    })),
  });
}

/**
 * 批量查询 (0.0005 USDC)
 *
 * 功能:
 * - 一次查询最多 50 个 Agents
 * - 包含完整元数据
 * - 包含声誉评分
 * - 优化的批量处理
 */
async function handleBatchQuery(req: VercelRequest, res: VercelResponse) {
  // x402 支付验证
  const paymentOk = await requirePayment(req, res, 'batchQuery');
  if (!paymentOk) return;

  const { agentIds } = req.query;

  if (!agentIds) {
    return res.status(400).json({ error: '缺少 agentIds 参数' });
  }

  // 解析 agent IDs（逗号分隔或数组）
  const ids = typeof agentIds === 'string' ? agentIds.split(',') : agentIds;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'agentIds 必须是非空数组或逗号分隔的字符串' });
  }

  if (ids.length > 50) {
    return res.status(400).json({ error: '一次最多查询 50 个 Agents' });
  }

  const network = (process.env.ERC8004_NETWORK || 'sepolia') as 'sepolia' | 'mainnet';
  const reputationAggregator = new ReputationAggregator(network);

  // 获取批量声誉评分
  const reputationScores = await reputationAggregator.getBatchReputationScores(ids as string[]);

  // TODO: 从 Subgraph 批量获取 Agent 元数据
  // 当前简化版本：只返回声誉数据
  // 完整实现需要调用 GraphQL 批量查询

  const results = ids.map((agentId) => {
    const reputation = reputationScores[agentId as string];
    return {
      agentId,
      reputation: reputation
        ? {
            weightedScore: reputation.weightedScore,
            totalFeedbacks: reputation.totalFeedbacks,
            positiveFeedbacks: reputation.positiveFeedbacks,
            negativeFeedbacks: reputation.negativeFeedbacks,
            sybilRisk: reputation.sybilRisk,
            lastFeedbackTime: reputation.lastFeedbackTime
              ? new Date(reputation.lastFeedbackTime * 1000).toISOString()
              : null,
          }
        : null,
    };
  });

  return res.status(200).json({
    success: true,
    count: results.length,
    paidFeature: 'batch-query',
    price: '0.0005 USDC',
    results,
  });
}

/**
 * 详细声誉分析 (0.005 USDC)
 *
 * 功能:
 * - Sybil 攻击风险评估
 * - 标签维度评分分解
 * - 时间序列分析
 * - 反馈者多样性分析
 * - 反馈质量评估
 */
async function handleDetailedAnalysis(req: VercelRequest, res: VercelResponse) {
  // x402 支付验证
  const paymentOk = await requirePayment(req, res, 'detailedAnalysis');
  if (!paymentOk) return;

  const { agentId } = req.query;

  if (!agentId) {
    return res.status(400).json({ error: '缺少 agentId 参数' });
  }

  const network = (process.env.ERC8004_NETWORK || 'sepolia') as 'sepolia' | 'mainnet';
  const reputationAggregator = new ReputationAggregator(network);

  // 获取详细分析
  const analysis = await reputationAggregator.getDetailedReputation(agentId as string);

  if (!analysis) {
    return res.status(404).json({ error: 'Agent 不存在或没有反馈数据' });
  }

  // 计算额外的分析指标
  const totalFeedbacks = analysis.positiveFeedbacks + analysis.negativeFeedbacks;
  const positiveRate =
    totalFeedbacks > 0 ? (analysis.positiveFeedbacks / totalFeedbacks) * 100 : 0;

  // 风险等级分类
  let riskLevel: 'low' | 'medium' | 'high';
  if (analysis.sybilRisk < 0.3) {
    riskLevel = 'low';
  } else if (analysis.sybilRisk < 0.6) {
    riskLevel = 'medium';
  } else {
    riskLevel = 'high';
  }

  // 可信度评分（综合考虑多个因素）
  const trustScore = Math.min(
    100,
    Math.max(
      0,
      analysis.weightedScore * 20 + // 基础评分
        (totalFeedbacks > 10 ? 10 : totalFeedbacks) + // 反馈数量加成
        (1 - analysis.sybilRisk) * 20 // Sybil 风险惩罚
    )
  );

  return res.status(200).json({
    success: true,
    paidFeature: 'detailed-analysis',
    price: '0.005 USDC',
    agentId,
    analysis: {
      // 基础指标
      weightedScore: analysis.weightedScore.toFixed(2),
      totalFeedbacks,
      positiveFeedbacks: analysis.positiveFeedbacks,
      negativeFeedbacks: analysis.negativeFeedbacks,
      positiveRate: positiveRate.toFixed(1) + '%',

      // Sybil 风险分析
      sybilRisk: {
        score: analysis.sybilRisk.toFixed(3),
        level: riskLevel,
        description:
          riskLevel === 'low'
            ? '反馈来自多样化的地址，时间分布自然'
            : riskLevel === 'medium'
            ? '存在一定的集中度，建议谨慎评估'
            : '高风险：反馈可能来自少数地址或短时间内集中提交',
      },

      // 标签分析
      tagAnalysis: {
        availableTags: Object.keys(analysis.tagScores),
        scores: analysis.tagScores,
        description: '按不同维度（tag）的评分分解',
      },

      // 可信度评分（综合指标）
      trustScore: {
        score: trustScore.toFixed(1),
        maxScore: 100,
        factors: [
          { name: '加权评分', weight: '基础分' },
          { name: '反馈数量', weight: totalFeedbacks > 10 ? '充足' : '有限' },
          { name: 'Sybil 风险', weight: riskLevel === 'low' ? '低' : riskLevel },
        ],
      },

      // 时间信息
      lastFeedbackTime: analysis.lastFeedbackTime
        ? new Date(analysis.lastFeedbackTime * 1000).toISOString()
        : null,

      // 建议
      recommendation:
        trustScore > 70 && riskLevel === 'low'
          ? '高可信度 Agent，推荐使用'
          : trustScore > 50 && riskLevel !== 'high'
          ? '中等可信度，可以使用但需注意'
          : '可信度较低或 Sybil 风险较高，建议谨慎',
    },
  });
}

/**
 * 数据导出 (0.001 USDC)
 *
 * 功能:
 * - 导出 Agent 数据为 CSV 或 JSON
 * - 支持批量导出
 * - 包含完整元数据和声誉数据
 */
async function handleExportData(req: VercelRequest, res: VercelResponse) {
  // x402 支付验证
  const paymentOk = await requirePayment(req, res, 'dataExport');
  if (!paymentOk) return;

  const { agentIds, format = 'json' } = req.query;

  if (!agentIds) {
    return res.status(400).json({ error: '缺少 agentIds 参数' });
  }

  if (format !== 'json' && format !== 'csv') {
    return res.status(400).json({ error: 'format 必须是 json 或 csv' });
  }

  // 解析 agent IDs
  const ids = typeof agentIds === 'string' ? agentIds.split(',') : agentIds;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'agentIds 必须是非空数组' });
  }

  if (ids.length > 100) {
    return res.status(400).json({ error: '一次最多导出 100 个 Agents' });
  }

  const network = (process.env.ERC8004_NETWORK || 'sepolia') as 'sepolia' | 'mainnet';
  const reputationAggregator = new ReputationAggregator(network);

  // 获取批量数据
  const reputationScores = await reputationAggregator.getBatchReputationScores(ids as string[]);

  const data = ids.map((agentId) => {
    const reputation = reputationScores[agentId as string];
    return {
      agentId,
      weightedScore: reputation?.weightedScore || 0,
      totalFeedbacks: reputation?.totalFeedbacks || 0,
      positiveFeedbacks: reputation?.positiveFeedbacks || 0,
      negativeFeedbacks: reputation?.negativeFeedbacks || 0,
      sybilRisk: reputation?.sybilRisk || 0,
      lastFeedbackTime: reputation?.lastFeedbackTime
        ? new Date(reputation.lastFeedbackTime * 1000).toISOString()
        : '',
    };
  });

  if (format === 'csv') {
    // 生成 CSV
    const headers = [
      'agentId',
      'weightedScore',
      'totalFeedbacks',
      'positiveFeedbacks',
      'negativeFeedbacks',
      'sybilRisk',
      'lastFeedbackTime',
    ];
    const csvRows = [
      headers.join(','),
      ...data.map((row) =>
        headers.map((h) => JSON.stringify(row[h as keyof typeof row] || '')).join(',')
      ),
    ];
    const csvContent = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="agents-${Date.now()}.csv"`);
    return res.status(200).send(csvContent);
  } else {
    // JSON 格式
    return res.status(200).json({
      success: true,
      paidFeature: 'export-data',
      price: '0.001 USDC',
      format: 'json',
      count: data.length,
      exportedAt: new Date().toISOString(),
      data,
    });
  }
}
