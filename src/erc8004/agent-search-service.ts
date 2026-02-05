/**
 * ERC-8004 Agent 搜索和发现服务
 *
 * 功能:
 * - 关键词搜索
 * - 能力/技能筛选
 * - 评分排序
 * - 推荐算法
 * - 分页支持
 */

import { GraphQLClient } from 'graphql-request';
import { ReputationAggregator } from './reputation-aggregator.js';

// Subgraph URLs
const SUBGRAPH_URLS: Record<string, string> = {
  sepolia:
    'https://gateway.thegraph.com/api/00a452ad3cd1900273ea62c1bf283f93/subgraphs/id/6wQRC7geo9XYAhckfmfo8kbMRLeWU8KQd3XsJqFKmZLT',
  mainnet:
    'https://gateway.thegraph.com/api/7fd2e7d89ce3ef24cd0d4590298f0b2c/subgraphs/id/FV6RR6y13rsnCxBAicKuQEwDp8ioEGiNaWaZUmvr1F8k',
};

/**
 * Agent 数据（从 Subgraph）
 */
export interface AgentData {
  id: string;
  agentId: string;
  owner: string;
  agentURI: string;
  createdAt: number;

  // 解析后的元数据（如果可用）
  metadata?: {
    name?: string;
    description?: string;
    image?: string;
    services?: any[];
    capabilities?: string[];
    skills?: string[];
    domains?: string[];
    x402Support?: boolean;
  };
}

/**
 * 搜索结果
 */
export interface SearchResult {
  agent: AgentData;
  score: number; // 相关性评分 (0-1)
  reputation?: {
    averageScore: number;
    totalFeedbacks: number;
    sybilRisk: number;
  };
}

/**
 * 搜索过滤器
 */
export interface SearchFilters {
  // 关键词
  keyword?: string;

  // 能力筛选
  capabilities?: string[];
  skills?: string[];
  domains?: string[];

  // 评分筛选
  minRating?: number;
  minFeedbacks?: number;

  // x402 支持
  x402Only?: boolean;

  // 排序
  sortBy?: 'relevance' | 'reputation' | 'recent' | 'feedbacks';
  sortOrder?: 'asc' | 'desc';

  // 分页
  limit?: number;
  offset?: number;
}

/**
 * Agent 搜索服务
 */
export class AgentSearchService {
  private client: GraphQLClient;
  private reputationAggregator: ReputationAggregator;
  private network: string;

  constructor(network: string = 'sepolia') {
    const url = SUBGRAPH_URLS[network];
    if (!url) {
      throw new Error(`Unsupported network: ${network}`);
    }
    this.client = new GraphQLClient(url);
    this.reputationAggregator = new ReputationAggregator(network);
    this.network = network;
  }

  /**
   * 搜索 Agents
   */
  async search(filters: SearchFilters = {}): Promise<SearchResult[]> {
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
      limit = 20,
      offset = 0,
    } = filters;

    // 1. 从 Subgraph 查询 Agents
    const agents = await this.queryAgents({ limit: limit * 2, offset }); // 多查一些用于过滤

    // 2. 解析元数据
    const agentsWithMetadata = await Promise.all(
      agents.map(async (agent) => ({
        agent,
        metadata: await this.parseAgentMetadata(agent.agentURI),
      }))
    );

    // 3. 应用过滤器
    let filteredAgents = agentsWithMetadata.filter((item) => {
      const { agent, metadata } = item;

      // 关键词匹配
      if (keyword) {
        const searchText = [
          metadata?.name,
          metadata?.description,
          ...(metadata?.capabilities || []),
          ...(metadata?.skills || []),
          ...(metadata?.domains || []),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        if (!searchText.includes(keyword.toLowerCase())) {
          return false;
        }
      }

      // 能力筛选
      if (capabilities && capabilities.length > 0) {
        const agentCapabilities = metadata?.capabilities || [];
        if (!capabilities.some((cap) => agentCapabilities.includes(cap))) {
          return false;
        }
      }

      // 技能筛选
      if (skills && skills.length > 0) {
        const agentSkills = metadata?.skills || [];
        if (!skills.some((skill) => agentSkills.includes(skill))) {
          return false;
        }
      }

      // 领域筛选
      if (domains && domains.length > 0) {
        const agentDomains = metadata?.domains || [];
        if (!domains.some((domain) => agentDomains.includes(domain))) {
          return false;
        }
      }

      // x402 筛选
      if (x402Only && !metadata?.x402Support) {
        return false;
      }

      return true;
    });

    // 4. 获取评分（批量）
    const agentIds = filteredAgents.map((item) => item.agent.agentId);
    const reputationScores = await this.reputationAggregator.getBatchReputationScores(
      agentIds
    );

    // 5. 应用评分过滤
    if (minRating !== undefined || minFeedbacks !== undefined) {
      filteredAgents = filteredAgents.filter((item) => {
        const reputation = reputationScores[item.agent.agentId];

        if (minRating !== undefined && reputation.weightedScore < minRating) {
          return false;
        }

        if (minFeedbacks !== undefined && reputation.totalFeedbacks < minFeedbacks) {
          return false;
        }

        return true;
      });
    }

    // 6. 计算相关性评分
    const results: SearchResult[] = filteredAgents.map((item) => {
      const { agent, metadata } = item;
      const reputation = reputationScores[agent.agentId];

      // 相关性评分（0-1）
      let relevanceScore = 0.5; // 基础分

      if (keyword && metadata) {
        const searchText = [
          metadata.name,
          metadata.description,
          ...(metadata.capabilities || []),
          ...(metadata.skills || []),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        // 标题匹配权重最高
        if (metadata.name?.toLowerCase().includes(keyword.toLowerCase())) {
          relevanceScore += 0.3;
        }

        // 描述匹配
        if (metadata.description?.toLowerCase().includes(keyword.toLowerCase())) {
          relevanceScore += 0.2;
        }
      }

      // 能力/技能匹配
      if (capabilities || skills) {
        relevanceScore += 0.1;
      }

      return {
        agent: {
          ...agent,
          metadata,
        },
        score: Math.min(1, relevanceScore),
        reputation: {
          averageScore: reputation.weightedScore,
          totalFeedbacks: reputation.totalFeedbacks,
          sybilRisk: reputation.sybilRisk,
        },
      };
    });

    // 7. 排序
    results.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'relevance':
          comparison = a.score - b.score;
          break;
        case 'reputation':
          comparison =
            (a.reputation?.averageScore || 0) - (b.reputation?.averageScore || 0);
          break;
        case 'recent':
          comparison = a.agent.createdAt - b.agent.createdAt;
          break;
        case 'feedbacks':
          comparison =
            (a.reputation?.totalFeedbacks || 0) - (b.reputation?.totalFeedbacks || 0);
          break;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    // 8. 分页
    return results.slice(0, limit);
  }

  /**
   * 获取热门 Agents
   */
  async getTrending(limit: number = 10): Promise<SearchResult[]> {
    return this.search({
      sortBy: 'reputation',
      sortOrder: 'desc',
      minFeedbacks: 5,
      limit,
    });
  }

  /**
   * 获取最新 Agents
   */
  async getRecent(limit: number = 10): Promise<SearchResult[]> {
    return this.search({
      sortBy: 'recent',
      sortOrder: 'desc',
      limit,
    });
  }

  /**
   * 推荐 Agents（基于能力相似度）
   */
  async getRecommendations(
    baseAgentId: string,
    limit: number = 5
  ): Promise<SearchResult[]> {
    // 1. 获取基准 Agent
    const baseAgent = await this.queryAgentById(baseAgentId);
    if (!baseAgent) {
      return [];
    }

    const baseMetadata = await this.parseAgentMetadata(baseAgent.agentURI);
    if (!baseMetadata) {
      return [];
    }

    // 2. 基于能力/技能查找相似 Agents
    const recommendations = await this.search({
      capabilities: baseMetadata.capabilities,
      skills: baseMetadata.skills,
      sortBy: 'reputation',
      limit: limit + 1, // 多查一个，排除自己
    });

    // 3. 排除自己
    return recommendations.filter((r) => r.agent.agentId !== baseAgentId).slice(0, limit);
  }

  /**
   * 查询 Agents（GraphQL）
   */
  private async queryAgents(options: {
    limit: number;
    offset: number;
  }): Promise<AgentData[]> {
    const query = `
      query GetAgents($first: Int!, $skip: Int!) {
        agents(
          first: $first
          skip: $skip
          orderBy: createdAt
          orderDirection: desc
        ) {
          id
          agentId
          owner
          agentURI
          createdAt
        }
      }
    `;

    const data = await this.client.request<{ agents: AgentData[] }>(query, {
      first: options.limit,
      skip: options.offset,
    });

    return data.agents;
  }

  /**
   * 查询单个 Agent
   */
  private async queryAgentById(agentId: string): Promise<AgentData | null> {
    const query = `
      query GetAgent($id: String!) {
        agent(id: $id) {
          id
          agentId
          owner
          agentURI
          createdAt
        }
      }
    `;

    const data = await this.client.request<{ agent: AgentData | null }>(query, {
      id: `${this.network === 'sepolia' ? '11155111' : '1'}:${agentId}`,
    });

    return data.agent;
  }

  /**
   * 解析 Agent 元数据
   */
  private async parseAgentMetadata(agentURI: string): Promise<any> {
    try {
      // data URI
      if (agentURI.startsWith('data:application/json;base64,')) {
        const base64 = agentURI.replace('data:application/json;base64,', '');
        const json = Buffer.from(base64, 'base64').toString('utf-8');
        return JSON.parse(json);
      }

      // IPFS URI
      if (agentURI.startsWith('ipfs://')) {
        const cid = agentURI.replace('ipfs://', '');
        const response = await fetch(`https://ipfs.io/ipfs/${cid}`);
        return await response.json();
      }

      // HTTP(S) URI
      if (agentURI.startsWith('http')) {
        const response = await fetch(agentURI);
        return await response.json();
      }

      return null;
    } catch (error) {
      console.error(`Failed to parse metadata for ${agentURI}:`, error);
      return null;
    }
  }
}
