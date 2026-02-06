/**
 * GET /api/v1/reputation/{network}/{agentId}
 *
 * 获取 Agent 的详细声誉评分
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { ReputationAggregator } from '../../src/erc8004/reputation-aggregator.js';
import { CacheService } from '../../src/cache/cache-service.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // 从路径解析参数：/api/v1/reputation/sepolia/123
    const path = req.url?.split('?')[0];
    const parts = path?.split('/').filter(Boolean);

    if (!parts || parts.length < 4) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Expected format: /api/v1/reputation/{network}/{agentId}',
      });
    }

    const network = parts[2] as 'sepolia' | 'mainnet';
    const agentId = parts[3];

    // 检查缓存
    const cached = await CacheService.getReputation(agentId, network);
    if (cached) {
      return res.status(200).json({
        success: true,
        cached: true,
        ...cached,
      });
    }

    // 查询声誉
    const aggregator = new ReputationAggregator(network);
    const reputation = await aggregator.getReputationScore(agentId);

    // 四维度评分
    const breakdown = extractDimensionScores(
      reputation.scoresByTag,
      reputation.totalFeedbacks,
      reputation.averageScore
    );
    const overall = calculateOverallScore(breakdown);

    const result = {
      agentId,
      network,
      reputation: {
        overall,
        breakdown,
        weightedScore: reputation.weightedScore,
        totalFeedbacks: reputation.totalFeedbacks,
        uniqueClients: reputation.uniqueClients,
        sybilRisk: reputation.sybilRisk,
        firstFeedbackAt: reputation.firstFeedbackAt
          ? new Date(reputation.firstFeedbackAt * 1000).toISOString()
          : null,
        lastFeedbackAt: reputation.lastFeedbackAt
          ? new Date(reputation.lastFeedbackAt * 1000).toISOString()
          : null,
      },
    };

    // 缓存结果
    await CacheService.cacheReputation(agentId, network, result);

    return res.status(200).json({
      success: true,
      cached: false,
      ...result,
    });
  } catch (error: any) {
    console.error('Reputation API error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
    });
  }
}

// 辅助函数（与 intelligent-matching-service.ts 相同）
function extractDimensionScores(
  tagScores: Record<string, { average: number; count: number }>,
  totalFeedbacks: number,
  averageScore: number
) {
  const normalize = (score: number) => Math.min(100, Math.max(0, score * 20)); // 0-5 => 0-100

  // 检查是否有标签数据
  const hasTagData = Object.keys(tagScores).length > 0;

  if (hasTagData) {
    const accuracyScore = getAverageForTags(tagScores, ['accuracy', 'correctness', 'quality']);
    const reliabilityScore = getAverageForTags(tagScores, ['reliability', 'uptime', 'stability']);
    const speedScore = getAverageForTags(tagScores, ['speed', 'latency', 'response-time']);
    const valueScore = getAverageForTags(tagScores, ['value', 'cost', 'price']);

    // 如果至少有一个维度有数据，使用标签评分
    if (accuracyScore || reliabilityScore || speedScore || valueScore) {
      return {
        accuracy: normalize(accuracyScore || 3.5),
        reliability: normalize(reliabilityScore || 3.5),
        speed: normalize(speedScore || 3.5),
        value: normalize(valueScore || 3.5),
      };
    }
  }

  // 降级：使用平均评分
  if (totalFeedbacks > 0) {
    const overall = normalize(averageScore);
    return {
      accuracy: overall,
      reliability: overall,
      speed: overall,
      value: overall,
    };
  }

  // 完全没有反馈，返回中性分 50
  return {
    accuracy: 50,
    reliability: 50,
    speed: 50,
    value: 50,
  };
}

function getAverageForTags(tagScores: Record<string, { average: number; count: number }>, tags: string[]): number | null {
  let total = 0;
  let count = 0;

  for (const tag of tags) {
    for (const [key, value] of Object.entries(tagScores)) {
      if (key.toLowerCase().includes(tag.toLowerCase())) {
        total += value.average * value.count;
        count += value.count;
      }
    }
  }

  return count > 0 ? total / count : null;
}

function calculateOverallScore(breakdown: { accuracy: number; reliability: number; speed: number; value: number }): number {
  return breakdown.accuracy * 0.35 + breakdown.reliability * 0.25 + breakdown.speed * 0.2 + breakdown.value * 0.2;
}
