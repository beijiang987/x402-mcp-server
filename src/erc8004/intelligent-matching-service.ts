/**
 * 智能匹配服务
 *
 * 核心功能：
 * - 理解用户任务
 * - 搜索候选 Agents
 * - 计算匹配度
 * - 生成匹配原因
 * - 按匹配度排序
 */

import { TaskUnderstandingService, type TaskUnderstanding } from './task-understanding-service.js';
import { AgentSearchService, type SearchResult } from './agent-search-service.js';
import { ReputationAggregator } from './reputation-aggregator.js';

/**
 * 匹配请求
 */
export interface MatchRequest {
  // 任务描述（自然语言）
  task: string;

  // 任务类别（可选，辅助理解）
  category?: string;

  // 最低声誉评分要求
  minReputationScore?: number;

  // 必需的能力
  requiredCapabilities?: string[];

  // 必需的技能
  requiredSkills?: string[];

  // 必需的领域
  requiredDomains?: string[];

  // 返回结果数量
  limit?: number;
}

/**
 * 匹配结果
 */
export interface MatchResult {
  // Agent 信息
  agent: {
    agentId: string;
    owner: string;
    name?: string;
    description?: string;
    image?: string;
    services?: any[];
    capabilities?: string[];
    skills?: string[];
    domains?: string[];
    x402Support?: boolean;
  };

  // 匹配度评分（0-1）
  matchScore: number;

  // 匹配原因（自然语言解释）
  matchReason: string;

  // 声誉评分
  reputation: {
    overall: number;
    breakdown: {
      accuracy: number;
      reliability: number;
      speed: number;
      value: number;
    };
    totalFeedbacks: number;
    sybilRisk: number;
  };

  // 任务理解（仅第一个结果返回）
  taskUnderstanding?: TaskUnderstanding;
}

/**
 * 智能匹配服务
 */
export class IntelligentMatchingService {
  private taskUnderstandingService: TaskUnderstandingService;
  private agentSearchService: AgentSearchService;
  private reputationAggregator: ReputationAggregator;
  private network: string;

  constructor(network: string = 'sepolia', anthropicApiKey?: string) {
    this.network = network;
    this.taskUnderstandingService = new TaskUnderstandingService(anthropicApiKey);
    this.agentSearchService = new AgentSearchService(network);
    this.reputationAggregator = new ReputationAggregator(network);
  }

  /**
   * 智能匹配
   */
  async match(request: MatchRequest): Promise<MatchResult[]> {
    const {
      task,
      category,
      minReputationScore,
      requiredCapabilities,
      requiredSkills,
      requiredDomains,
      limit = 10,
    } = request;

    // 1. 理解任务
    console.log('🧠 Understanding task...');
    const taskUnderstanding = await this.taskUnderstandingService.understandTask(task);

    // 2. 合并用户要求和 AI 理解的结果
    const searchCapabilities = [
      ...(requiredCapabilities || []),
      ...taskUnderstanding.capabilities,
    ].filter((v, i, a) => a.indexOf(v) === i); // 去重

    const searchSkills = [...(requiredSkills || []), ...taskUnderstanding.skills].filter(
      (v, i, a) => a.indexOf(v) === i
    );

    const searchDomains = [...(requiredDomains || []), ...taskUnderstanding.domains].filter(
      (v, i, a) => a.indexOf(v) === i
    );

    // 3. 搜索候选 Agents（获取更多候选，后续按匹配度排序）
    console.log('🔍 Searching candidate agents...');
    const candidates = await this.agentSearchService.search({
      capabilities: searchCapabilities.length > 0 ? searchCapabilities : undefined,
      skills: searchSkills.length > 0 ? searchSkills : undefined,
      domains: searchDomains.length > 0 ? searchDomains : undefined,
      minRating: minReputationScore,
      sortBy: 'reputation',
      limit: limit * 3, // 多查一些用于匹配排序
    });

    if (candidates.length === 0) {
      return [];
    }

    // 4. 计算每个候选的匹配度
    console.log('📊 Calculating match scores...');
    const matchResults: MatchResult[] = [];

    for (const candidate of candidates) {
      // 计算语义相似度
      const matchScore = this.taskUnderstandingService.calculateSimilarity(
        taskUnderstanding,
        {
          domains: candidate.agent.metadata?.domains,
          skills: candidate.agent.metadata?.skills,
          capabilities: candidate.agent.metadata?.capabilities,
          description: candidate.agent.metadata?.description,
        }
      );

      // 生成匹配原因
      const matchReason = await this.taskUnderstandingService.generateMatchReason(
        taskUnderstanding,
        {
          name: candidate.agent.metadata?.name,
          description: candidate.agent.metadata?.description,
          domains: candidate.agent.metadata?.domains,
          skills: candidate.agent.metadata?.skills,
          capabilities: candidate.agent.metadata?.capabilities,
        },
        matchScore
      );

      // 获取四维度评分
      const reputationBreakdown = await this.getReputationBreakdown(
        candidate.agent.agentId
      );

      matchResults.push({
        agent: {
          agentId: candidate.agent.agentId,
          owner: candidate.agent.owner,
          name: candidate.agent.metadata?.name,
          description: candidate.agent.metadata?.description,
          image: candidate.agent.metadata?.image,
          services: candidate.agent.metadata?.services,
          capabilities: candidate.agent.metadata?.capabilities,
          skills: candidate.agent.metadata?.skills,
          domains: candidate.agent.metadata?.domains,
          x402Support: candidate.agent.metadata?.x402Support,
        },
        matchScore,
        matchReason,
        reputation: reputationBreakdown,
      });
    }

    // 5. 按匹配度排序
    matchResults.sort((a, b) => {
      // 综合排序：匹配度 70% + 声誉 30%
      const scoreA = a.matchScore * 0.7 + a.reputation.overall / 100 * 0.3;
      const scoreB = b.matchScore * 0.7 + b.reputation.overall / 100 * 0.3;
      return scoreB - scoreA;
    });

    // 6. 返回前 N 个结果
    const topResults = matchResults.slice(0, limit);

    // 7. 在第一个结果中包含任务理解
    if (topResults.length > 0) {
      topResults[0].taskUnderstanding = taskUnderstanding;
    }

    return topResults;
  }

  /**
   * 获取四维度声誉评分
   */
  private async getReputationBreakdown(agentId: string): Promise<{
    overall: number;
    breakdown: {
      accuracy: number;
      reliability: number;
      speed: number;
      value: number;
    };
    totalFeedbacks: number;
    sybilRisk: number;
  }> {
    try {
      // 获取基础评分
      const reputation = await this.reputationAggregator.getReputationScore(agentId);

      // 从 tagScores 提取四维度（传入完整 reputation 用于降级）
      const breakdown = this.extractDimensionScores(
        reputation.scoresByTag,
        reputation.totalFeedbacks,
        reputation.averageScore
      );

      // 计算加权总分
      const overall = this.calculateOverallScore(breakdown);

      return {
        overall,
        breakdown,
        totalFeedbacks: reputation.totalFeedbacks,
        sybilRisk: reputation.sybilRisk,
      };
    } catch (error) {
      console.error(`Failed to get reputation for ${agentId}:`, error);

      // 返回默认值
      return {
        overall: 50,
        breakdown: {
          accuracy: 50,
          reliability: 50,
          speed: 50,
          value: 50,
        },
        totalFeedbacks: 0,
        sybilRisk: 1,
      };
    }
  }

  /**
   * 从 tag 评分中提取四维度
   *
   * 策略：
   * 1. 如果有标签数据（tag1/tag2），尝试映射到四维度
   * 2. 否则，使用平均评分（0-5）转换为 0-100 的综合评分
   */
  private extractDimensionScores(
    tagScores: Record<string, { average: number; count: number }>,
    totalFeedbacks: number,
    averageScore: number
  ): {
    accuracy: number;
    reliability: number;
    speed: number;
    value: number;
  } {
    const normalize = (score: number) => Math.min(100, Math.max(0, score * 20)); // 0-5 => 0-100

    // 检查是否有标签数据
    const hasTagData = Object.keys(tagScores).length > 0;

    if (hasTagData) {
      // 方案 A：尝试从标签提取四维度
      const accuracyScore = this.getAverageForTags(tagScores, ['accuracy', 'correctness', 'quality']);
      const reliabilityScore = this.getAverageForTags(tagScores, ['reliability', 'uptime', 'stability']);
      const speedScore = this.getAverageForTags(tagScores, ['speed', 'latency', 'response-time', 'performance']);
      const valueScore = this.getAverageForTags(tagScores, ['value', 'cost', 'price', 'cost-effectiveness']);

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

    // 方案 B（降级）：使用平均评分
    // 如果没有标签，用 averageScore（0-5）推断
    // 假设 value > 0 = 正面反馈, value < 0 = 负面反馈
    // averageScore 已经是加权平均值
    if (totalFeedbacks > 0) {
      const overall = normalize(averageScore);
      console.log(`Agent has no tag data, using averageScore ${averageScore.toFixed(2)} => ${overall.toFixed(0)}/100`);

      // 四个维度都用同一个分数，直到有标签数据
      return {
        accuracy: overall,
        reliability: overall,
        speed: overall,
        value: overall,
      };
    }

    // 完全没有反馈数据，返回中性分 50
    return {
      accuracy: 50,
      reliability: 50,
      speed: 50,
      value: 50,
    };
  }

  /**
   * 获取多个 tags 的平均分
   */
  private getAverageForTags(
    tagScores: Record<string, { average: number; count: number }>,
    tags: string[]
  ): number | null {
    let total = 0;
    let count = 0;

    for (const tag of tags) {
      const tagLower = tag.toLowerCase();
      for (const [key, value] of Object.entries(tagScores)) {
        if (key.toLowerCase().includes(tagLower)) {
          total += value.average * value.count;
          count += value.count;
        }
      }
    }

    return count > 0 ? total / count : null;
  }

  /**
   * 计算加权总分
   *
   * 权重：
   * - accuracy: 35%
   * - reliability: 25%
   * - speed: 20%
   * - value: 20%
   */
  private calculateOverallScore(breakdown: {
    accuracy: number;
    reliability: number;
    speed: number;
    value: number;
  }): number {
    return (
      breakdown.accuracy * 0.35 +
      breakdown.reliability * 0.25 +
      breakdown.speed * 0.2 +
      breakdown.value * 0.2
    );
  }
}
