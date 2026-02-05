/**
 * ERC-8004 声誉聚合服务
 *
 * 功能:
 * - 从 Subgraph 查询 Feedbacks
 * - 计算加权平均评分
 * - 分领域评分（tag1, tag2）
 * - 时间衰减
 * - 反 Sybil 过滤
 */

import { GraphQLClient } from 'graphql-request';

// Subgraph URLs
const SUBGRAPH_URLS: Record<string, string> = {
  sepolia:
    'https://gateway.thegraph.com/api/00a452ad3cd1900273ea62c1bf283f93/subgraphs/id/6wQRC7geo9XYAhckfmfo8kbMRLeWU8KQd3XsJqFKmZLT',
  mainnet:
    'https://gateway.thegraph.com/api/7fd2e7d89ce3ef24cd0d4590298f0b2c/subgraphs/id/FV6RR6y13rsnCxBAicKuQEwDp8ioEGiNaWaZUmvr1F8k',
};

/**
 * 反馈数据（从 Subgraph）
 */
export interface FeedbackData {
  id: string;
  agentId: string;
  clientAddress: string;
  value: string; // int128
  valueDecimals: number; // 0-18
  tag1?: string;
  tag2?: string;
  createdAt: number;
  revoked: boolean;
}

/**
 * 聚合评分结果
 */
export interface ReputationScore {
  agentId: string;

  // 总体评分
  averageScore: number; // 平均分
  totalFeedbacks: number; // 总反馈数
  weightedScore: number; // 加权评分

  // 时间加权
  recentScore: number; // 近期评分（30天）

  // 分领域评分
  scoresByTag: Record<string, {
    average: number;
    count: number;
  }>;

  // 质量指标
  uniqueClients: number; // 唯一评价者数量
  sybilRisk: number; // Sybil 风险评分 (0-1)

  // 时间统计
  firstFeedbackAt?: number;
  lastFeedbackAt?: number;
}

/**
 * 聚合配置
 */
export interface AggregationConfig {
  // 时间衰减因子（天）
  timeDecayDays?: number;

  // 最小反馈数（低于此数标记为"数据不足"）
  minFeedbacks?: number;

  // Sybil 检测阈值
  sybilThreshold?: number;

  // 分领域过滤
  tags?: string[];
}

/**
 * 声誉聚合器
 */
export class ReputationAggregator {
  private client: GraphQLClient;
  private network: string;

  constructor(network: string = 'sepolia') {
    const url = SUBGRAPH_URLS[network];
    if (!url) {
      throw new Error(`Unsupported network: ${network}`);
    }
    this.client = new GraphQLClient(url);
    this.network = network;
  }

  /**
   * 获取 Agent 的所有反馈
   */
  async getFeedbacks(agentId: string): Promise<FeedbackData[]> {
    const query = `
      query GetFeedbacks($agentId: String!) {
        feedbacks(
          where: { agentId: $agentId, revoked: false }
          orderBy: createdAt
          orderDirection: desc
        ) {
          id
          agentId
          clientAddress
          value
          valueDecimals
          tag1
          tag2
          createdAt
          revoked
        }
      }
    `;

    const data = await this.client.request<{ feedbacks: FeedbackData[] }>(
      query,
      { agentId }
    );

    return data.feedbacks;
  }

  /**
   * 计算聚合评分
   */
  async getReputationScore(
    agentId: string,
    config: AggregationConfig = {}
  ): Promise<ReputationScore> {
    const {
      timeDecayDays = 30,
      minFeedbacks = 5,
      sybilThreshold = 0.7,
      tags,
    } = config;

    // 1. 获取所有反馈
    const feedbacks = await this.getFeedbacks(agentId);

    if (feedbacks.length === 0) {
      return {
        agentId,
        averageScore: 0,
        totalFeedbacks: 0,
        weightedScore: 0,
        recentScore: 0,
        scoresByTag: {},
        uniqueClients: 0,
        sybilRisk: 0,
      };
    }

    // 2. 过滤标签（如果指定）
    let filteredFeedbacks = feedbacks;
    if (tags && tags.length > 0) {
      filteredFeedbacks = feedbacks.filter(
        (f) => (f.tag1 && tags.includes(f.tag1)) || (f.tag2 && tags.includes(f.tag2))
      );
    }

    // 3. 转换为数值评分
    const scores = filteredFeedbacks.map((f) => ({
      ...f,
      numericScore: this.parseScore(f.value, f.valueDecimals),
      timestamp: f.createdAt,
    }));

    // 4. 计算平均分
    const averageScore =
      scores.reduce((sum, s) => sum + s.numericScore, 0) / scores.length;

    // 5. 计算加权评分（时间衰减）
    const now = Date.now() / 1000;
    const weightedScore = this.calculateWeightedScore(scores, now, timeDecayDays);

    // 6. 计算近期评分（最近 30 天）
    const thirtyDaysAgo = now - 30 * 24 * 3600;
    const recentScores = scores.filter((s) => s.timestamp > thirtyDaysAgo);
    const recentScore =
      recentScores.length > 0
        ? recentScores.reduce((sum, s) => sum + s.numericScore, 0) / recentScores.length
        : averageScore;

    // 7. 分领域评分
    const scoresByTag = this.calculateScoresByTag(scores);

    // 8. 唯一评价者
    const uniqueClients = new Set(
      filteredFeedbacks.map((f) => f.clientAddress.toLowerCase())
    ).size;

    // 9. Sybil 风险评分
    const sybilRisk = this.calculateSybilRisk(filteredFeedbacks, sybilThreshold);

    // 10. 时间统计
    const timestamps = scores.map((s) => s.timestamp).sort((a, b) => a - b);
    const firstFeedbackAt = timestamps[0];
    const lastFeedbackAt = timestamps[timestamps.length - 1];

    return {
      agentId,
      averageScore,
      totalFeedbacks: filteredFeedbacks.length,
      weightedScore,
      recentScore,
      scoresByTag,
      uniqueClients,
      sybilRisk,
      firstFeedbackAt,
      lastFeedbackAt,
    };
  }

  /**
   * 批量获取评分
   */
  async getBatchReputationScores(
    agentIds: string[],
    config: AggregationConfig = {}
  ): Promise<Record<string, ReputationScore>> {
    const results: Record<string, ReputationScore> = {};

    await Promise.all(
      agentIds.map(async (agentId) => {
        try {
          results[agentId] = await this.getReputationScore(agentId, config);
        } catch (error) {
          console.error(`Error getting reputation for ${agentId}:`, error);
          results[agentId] = {
            agentId,
            averageScore: 0,
            totalFeedbacks: 0,
            weightedScore: 0,
            recentScore: 0,
            scoresByTag: {},
            uniqueClients: 0,
            sybilRisk: 1, // 标记为高风险
          };
        }
      })
    );

    return results;
  }

  /**
   * 解析 int128 评分为数值
   */
  private parseScore(value: string, valueDecimals: number): number {
    const bigIntValue = BigInt(value);
    const divisor = BigInt(10 ** valueDecimals);
    return Number(bigIntValue) / Number(divisor);
  }

  /**
   * 计算加权评分（时间衰减）
   */
  private calculateWeightedScore(
    scores: Array<{ numericScore: number; timestamp: number }>,
    now: number,
    decayDays: number
  ): number {
    const decayFactor = 1 / (decayDays * 24 * 3600); // 每秒衰减率

    let totalWeight = 0;
    let weightedSum = 0;

    for (const score of scores) {
      const age = now - score.timestamp;
      const weight = Math.exp(-age * decayFactor); // 指数衰减
      weightedSum += score.numericScore * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * 分领域评分
   */
  private calculateScoresByTag(
    scores: Array<{ numericScore: number; tag1?: string; tag2?: string }>
  ): Record<string, { average: number; count: number }> {
    const tagScores: Record<string, number[]> = {};

    for (const score of scores) {
      if (score.tag1) {
        if (!tagScores[score.tag1]) tagScores[score.tag1] = [];
        tagScores[score.tag1].push(score.numericScore);
      }
      if (score.tag2) {
        if (!tagScores[score.tag2]) tagScores[score.tag2] = [];
        tagScores[score.tag2].push(score.numericScore);
      }
    }

    const result: Record<string, { average: number; count: number }> = {};

    for (const [tag, values] of Object.entries(tagScores)) {
      result[tag] = {
        average: values.reduce((sum, v) => sum + v, 0) / values.length,
        count: values.length,
      };
    }

    return result;
  }

  /**
   * 计算 Sybil 风险
   *
   * 检测指标:
   * - 评价者地址重复度
   * - 评分时间模式（短时间内大量评分）
   * - 评分分布（全是极端值）
   */
  private calculateSybilRisk(
    feedbacks: FeedbackData[],
    threshold: number
  ): number {
    if (feedbacks.length < 3) return 0; // 数据太少，无法判断

    // 1. 地址重复度
    const uniqueAddresses = new Set(
      feedbacks.map((f) => f.clientAddress.toLowerCase())
    ).size;
    const addressDiversity = uniqueAddresses / feedbacks.length;

    // 2. 时间集中度（1小时内的反馈占比）
    const timestamps = feedbacks.map((f) => f.createdAt).sort((a, b) => a - b);
    let maxInHour = 0;

    for (let i = 0; i < timestamps.length; i++) {
      const hourEnd = timestamps[i] + 3600;
      const countInHour = timestamps.filter(
        (t) => t >= timestamps[i] && t <= hourEnd
      ).length;
      maxInHour = Math.max(maxInHour, countInHour);
    }

    const timeConcentration = maxInHour / feedbacks.length;

    // 3. 综合风险评分 (0-1，越高风险越大)
    const risk =
      (1 - addressDiversity) * 0.6 + // 地址多样性权重 60%
      timeConcentration * 0.4; // 时间集中度权重 40%

    return Math.min(1, risk);
  }
}

/**
 * 辅助函数：格式化评分用于展示
 */
export function formatReputationScore(score: ReputationScore): string {
  const stars = '⭐'.repeat(Math.round(score.weightedScore));
  const sybilWarning = score.sybilRisk > 0.7 ? ' ⚠️ 高 Sybil 风险' : '';

  return `${stars} ${score.weightedScore.toFixed(2)} (${score.totalFeedbacks} 条反馈)${sybilWarning}`;
}
