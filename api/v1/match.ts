/**
 * POST /api/v1/match
 *
 * 智能匹配 API - 根据任务描述匹配最合适的 AI Agents
 *
 * 核心功能：
 * - 理解任务需求（使用 Claude API）
 * - 语义匹配候选 Agents
 * - 计算匹配度和生成匹配原因
 * - 返回排序后的推荐列表
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { IntelligentMatchingService, type MatchRequest } from '../../src/erc8004/intelligent-matching-service.js';

/**
 * 主路由处理器
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS 设置
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method Not Allowed',
      message: 'Only POST requests are supported',
    });
  }

  try {
    // 解析请求体
    const {
      task,
      category,
      minReputationScore,
      requiredCapabilities,
      requiredSkills,
      requiredDomains,
      limit,
    } = req.body as MatchRequest;

    // 验证必需参数
    if (!task || typeof task !== 'string' || task.trim().length === 0) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Missing or invalid "task" field',
      });
    }

    // 获取配置
    const network = (process.env.ERC8004_NETWORK || 'sepolia') as 'sepolia' | 'mainnet';
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

    if (!anthropicApiKey) {
      console.warn('⚠️ ANTHROPIC_API_KEY not configured, using fallback task understanding');
    }

    // 执行匹配
    const startTime = Date.now();
    const matchingService = new IntelligentMatchingService(network, anthropicApiKey);

    const results = await matchingService.match({
      task,
      category,
      minReputationScore,
      requiredCapabilities,
      requiredSkills,
      requiredDomains,
      limit: limit || 10,
    });

    const duration = Date.now() - startTime;

    // 返回结果
    return res.status(200).json({
      success: true,
      matchCount: results.length,
      processingTime: `${duration}ms`,
      taskUnderstanding: results[0]?.taskUnderstanding,
      matches: results.map(r => ({
        agent: r.agent,
        matchScore: Number(r.matchScore.toFixed(3)),
        matchReason: r.matchReason,
        reputation: {
          overall: Number(r.reputation.overall.toFixed(1)),
          breakdown: {
            accuracy: Number(r.reputation.breakdown.accuracy.toFixed(1)),
            reliability: Number(r.reputation.breakdown.reliability.toFixed(1)),
            speed: Number(r.reputation.breakdown.speed.toFixed(1)),
            value: Number(r.reputation.breakdown.value.toFixed(1)),
          },
          totalFeedbacks: r.reputation.totalFeedbacks,
          sybilRisk: Number(r.reputation.sybilRisk.toFixed(3)),
        },
      })),
    });
  } catch (error: any) {
    console.error('Match API error:', error);

    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
    });
  }
}
