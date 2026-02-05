/**
 * The Graph Subgraph 客户端
 *
 * 用于查询 ERC-8004 链上数据
 * 使用 The Graph 的 ERC-8004 Subgraph
 */

import { GraphQLClient } from 'graphql-request';
import { Agent, Feedback, ReputationScore } from './contracts.js';

// The Graph Subgraph 端点
const SUBGRAPH_URLS = {
  sepolia:
    'https://api.studio.thegraph.com/query/xxxxx/erc8004-sepolia/version/latest',
  mainnet:
    'https://api.studio.thegraph.com/query/xxxxx/erc8004-mainnet/version/latest',
} as const;

export class ERC8004GraphClient {
  private client: GraphQLClient;
  private network: 'sepolia' | 'mainnet';

  constructor(network: 'sepolia' | 'mainnet' = 'sepolia') {
    this.network = network;
    this.client = new GraphQLClient(SUBGRAPH_URLS[network]);
  }

  /**
   * 查询所有已注册的 agents
   */
  async getAllAgents(params?: {
    first?: number;
    skip?: number;
    orderBy?: 'createdAt' | 'name';
    orderDirection?: 'asc' | 'desc';
  }): Promise<Agent[]> {
    const query = `
      query GetAllAgents(
        $first: Int
        $skip: Int
        $orderBy: String
        $orderDirection: String
      ) {
        agents(
          first: $first
          skip: $skip
          orderBy: $orderBy
          orderDirection: $orderDirection
        ) {
          id
          agentId
          owner
          name
          metadata
          createdAt
        }
      }
    `;

    const variables = {
      first: params?.first || 100,
      skip: params?.skip || 0,
      orderBy: params?.orderBy || 'createdAt',
      orderDirection: params?.orderDirection || 'desc',
    };

    const data = await this.client.request<{ agents: any[] }>(query, variables);

    return data.agents.map((agent) => ({
      agentId: agent.agentId,
      owner: agent.owner,
      name: agent.name,
      metadata: JSON.parse(agent.metadata),
      createdAt: parseInt(agent.createdAt),
    }));
  }

  /**
   * 根据 ID 查询 agent
   */
  async getAgentById(agentId: string): Promise<Agent | null> {
    const query = `
      query GetAgent($agentId: String!) {
        agent(id: $agentId) {
          id
          agentId
          owner
          name
          metadata
          createdAt
          feedbacks {
            rating
          }
        }
      }
    `;

    const data = await this.client.request<{ agent: any }>(query, { agentId });

    if (!data.agent) return null;

    const agent = data.agent;

    // 计算声誉分数
    const reputation = this.calculateReputation(agent.feedbacks || []);

    return {
      agentId: agent.agentId,
      owner: agent.owner,
      name: agent.name,
      metadata: JSON.parse(agent.metadata),
      createdAt: parseInt(agent.createdAt),
      reputation,
    };
  }

  /**
   * 搜索 agents（按名称、标签、能力等）
   */
  async searchAgents(params: {
    keyword?: string;
    tags?: string[];
    capabilities?: string[];
    minRating?: number;
    first?: number;
    skip?: number;
  }): Promise<Agent[]> {
    const query = `
      query SearchAgents(
        $first: Int
        $skip: Int
        $nameContains: String
      ) {
        agents(
          first: $first
          skip: $skip
          where: {
            name_contains_nocase: $nameContains
          }
          orderBy: createdAt
          orderDirection: desc
        ) {
          id
          agentId
          owner
          name
          metadata
          createdAt
          feedbacks {
            rating
          }
        }
      }
    `;

    const variables = {
      first: params.first || 50,
      skip: params.skip || 0,
      nameContains: params.keyword || '',
    };

    const data = await this.client.request<{ agents: any[] }>(query, variables);

    // 解析和过滤结果
    let agents = data.agents.map((agent) => {
      const reputation = this.calculateReputation(agent.feedbacks || []);
      return {
        agentId: agent.agentId,
        owner: agent.owner,
        name: agent.name,
        metadata: JSON.parse(agent.metadata),
        createdAt: parseInt(agent.createdAt),
        reputation,
      };
    });

    // 客户端过滤（按标签、能力、评分等）
    if (params.tags && params.tags.length > 0) {
      agents = agents.filter((agent) => {
        const agentTags = agent.metadata.tags || [];
        return params.tags!.some((tag) => agentTags.includes(tag));
      });
    }

    if (params.capabilities && params.capabilities.length > 0) {
      agents = agents.filter((agent) => {
        const agentCapabilities = agent.metadata.capabilities || [];
        return params.capabilities!.some((cap) =>
          agentCapabilities.includes(cap)
        );
      });
    }

    if (params.minRating) {
      agents = agents.filter(
        (agent) =>
          agent.reputation &&
          agent.reputation.averageRating >= params.minRating!
      );
    }

    return agents;
  }

  /**
   * 获取 agent 的所有反馈
   */
  async getAgentFeedbacks(
    agentId: string,
    params?: {
      first?: number;
      skip?: number;
    }
  ): Promise<Feedback[]> {
    const query = `
      query GetAgentFeedbacks(
        $agentId: String!
        $first: Int
        $skip: Int
      ) {
        feedbacks(
          where: { agentId: $agentId }
          first: $first
          skip: $skip
          orderBy: timestamp
          orderDirection: desc
        ) {
          id
          feedbackId
          agentId
          reviewer
          rating
          comment
          timestamp
        }
      }
    `;

    const variables = {
      agentId,
      first: params?.first || 50,
      skip: params?.skip || 0,
    };

    const data = await this.client.request<{ feedbacks: any[] }>(
      query,
      variables
    );

    return data.feedbacks.map((feedback) => ({
      feedbackId: feedback.feedbackId,
      agentId: feedback.agentId,
      reviewer: feedback.reviewer,
      rating: parseInt(feedback.rating),
      comment: feedback.comment,
      timestamp: parseInt(feedback.timestamp),
    }));
  }

  /**
   * 获取热门 agents（按评分和反馈数）
   */
  async getTrendingAgents(limit: number = 10): Promise<Agent[]> {
    const query = `
      query GetTrendingAgents($first: Int) {
        agents(
          first: $first
          orderBy: createdAt
          orderDirection: desc
        ) {
          id
          agentId
          owner
          name
          metadata
          createdAt
          feedbacks {
            rating
          }
        }
      }
    `;

    const data = await this.client.request<{ agents: any[] }>(query, {
      first: limit * 3, // 获取更多以便排序
    });

    // 计算每个 agent 的综合分数
    const agents = data.agents.map((agent) => {
      const reputation = this.calculateReputation(agent.feedbacks || []);
      const trendingScore =
        (reputation.averageRating / 5) * 0.7 +
        Math.min(reputation.totalFeedbacks / 100, 1) * 0.3;

      return {
        agentId: agent.agentId,
        owner: agent.owner,
        name: agent.name,
        metadata: JSON.parse(agent.metadata),
        createdAt: parseInt(agent.createdAt),
        reputation,
        trendingScore,
      };
    });

    // 按 trending score 排序并返回前 N 个
    return agents
      .sort((a, b) => (b.trendingScore || 0) - (a.trendingScore || 0))
      .slice(0, limit);
  }

  /**
   * 获取统计数据
   */
  async getStats(): Promise<{
    totalAgents: number;
    totalFeedbacks: number;
    averageRating: number;
  }> {
    const query = `
      query GetStats {
        stats: _meta {
          block {
            number
          }
        }
        agents(first: 1000) {
          id
          feedbacks {
            rating
          }
        }
      }
    `;

    const data = await this.client.request<{ agents: any[] }>(query);

    const totalAgents = data.agents.length;
    let totalFeedbacks = 0;
    let totalRating = 0;

    data.agents.forEach((agent) => {
      const feedbacks = agent.feedbacks || [];
      totalFeedbacks += feedbacks.length;
      feedbacks.forEach((f: any) => {
        totalRating += parseInt(f.rating);
      });
    });

    return {
      totalAgents,
      totalFeedbacks,
      averageRating: totalFeedbacks > 0 ? totalRating / totalFeedbacks : 0,
    };
  }

  /**
   * 计算声誉分数
   */
  private calculateReputation(feedbacks: any[]): ReputationScore {
    if (feedbacks.length === 0) {
      return {
        averageRating: 0,
        totalFeedbacks: 0,
        totalInteractions: 0,
      };
    }

    const totalRating = feedbacks.reduce(
      (sum, f) => sum + parseInt(f.rating),
      0
    );

    return {
      averageRating: totalRating / feedbacks.length,
      totalFeedbacks: feedbacks.length,
      totalInteractions: feedbacks.length, // 简化版，实际应该追踪所有交互
    };
  }
}
