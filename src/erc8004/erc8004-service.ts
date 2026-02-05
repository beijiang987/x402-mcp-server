/**
 * ERC-8004 服务层
 *
 * 处理 AI Agent 的身份注册、声誉管理和链上交互
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  type Address,
} from 'viem';
import { sepolia, mainnet, base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import {
  IDENTITY_REGISTRY_ABI,
  REPUTATION_REGISTRY_ABI,
  CONTRACT_ADDRESSES,
  type AgentMetadata,
  type Agent,
  type Feedback,
} from './contracts.js';
import { ERC8004GraphClient } from './graph-client.js';
import { logger } from '../utils/logger.js';

// 支持的网络配置
const CHAINS = {
  sepolia: sepolia,
  mainnet: mainnet,
  base: base,
} as const;

export class ERC8004Service {
  private publicClient: any;
  private walletClient: any;
  private graphClient: ERC8004GraphClient;
  private network: 'sepolia' | 'mainnet' | 'base';
  private account: any;

  constructor(
    privateKey: string,
    network: 'sepolia' | 'mainnet' | 'base' = 'sepolia',
    rpcUrl?: string
  ) {
    this.network = network;
    const chain = CHAINS[network];

    // 创建公共客户端用于读取
    this.publicClient = createPublicClient({
      chain,
      transport: http(rpcUrl),
    });

    // 创建钱包客户端用于写入
    this.account = privateKeyToAccount(privateKey as `0x${string}`);
    this.walletClient = createWalletClient({
      account: this.account,
      chain,
      transport: http(rpcUrl),
    });

    // 创建 Graph 客户端（仅支持 sepolia 和 mainnet）
    this.graphClient = new ERC8004GraphClient(
      network === 'base' ? 'mainnet' : network
    );

    logger.info('ERC8004Service 初始化完成', {
      network,
      account: this.account.address,
    });
  }

  /**
   * 注册新的 AI Agent
   */
  async registerAgent(
    name: string,
    metadata: AgentMetadata
  ): Promise<{ agentId: string; txHash: string }> {
    try {
      logger.info('正在注册新 agent', { name });

      const contractAddress =
        CONTRACT_ADDRESSES[this.network].identityRegistry as Address;

      // 准备交易
      const { request } = await this.publicClient.simulateContract({
        address: contractAddress,
        abi: IDENTITY_REGISTRY_ABI,
        functionName: 'register',
        args: [name, JSON.stringify(metadata)],
        account: this.account,
      });

      // 发送交易
      const hash = await this.walletClient.writeContract(request);

      logger.info('注册交易已发送', { txHash: hash });

      // 等待交易确认
      const receipt = await this.publicClient.waitForTransactionReceipt({
        hash,
      });

      // 从事件日志中提取 agentId
      const log = receipt.logs.find(
        (log: any) =>
          log.address.toLowerCase() === contractAddress.toLowerCase()
      );

      let agentId = '0';
      if (log && log.topics && log.topics[1]) {
        agentId = BigInt(log.topics[1]).toString();
      }

      logger.info('Agent 注册成功', { agentId, txHash: hash });

      return {
        agentId,
        txHash: hash,
      };
    } catch (error) {
      logger.error('注册 agent 失败', error as Error);
      throw error;
    }
  }

  /**
   * 更新 Agent 元数据
   */
  async updateAgentMetadata(
    agentId: string,
    metadata: AgentMetadata
  ): Promise<{ txHash: string }> {
    try {
      logger.info('正在更新 agent 元数据', { agentId });

      const contractAddress =
        CONTRACT_ADDRESSES[this.network].identityRegistry as Address;

      const { request } = await this.publicClient.simulateContract({
        address: contractAddress,
        abi: IDENTITY_REGISTRY_ABI,
        functionName: 'updateMetadata',
        args: [BigInt(agentId), JSON.stringify(metadata)],
        account: this.account,
      });

      const hash = await this.walletClient.writeContract(request);

      await this.publicClient.waitForTransactionReceipt({ hash });

      logger.info('元数据更新成功', { agentId, txHash: hash });

      return { txHash: hash };
    } catch (error) {
      logger.error('更新元数据失败', error as Error);
      throw error;
    }
  }

  /**
   * 提交对 Agent 的反馈/评分
   */
  async submitFeedback(
    agentId: string,
    rating: number,
    comment: string
  ): Promise<{ feedbackId: string; txHash: string }> {
    try {
      // 验证评分范围
      if (rating < 1 || rating > 5) {
        throw new Error('评分必须在 1-5 之间');
      }

      logger.info('正在提交反馈', { agentId, rating });

      const contractAddress =
        CONTRACT_ADDRESSES[this.network].reputationRegistry as Address;

      const { request } = await this.publicClient.simulateContract({
        address: contractAddress,
        abi: REPUTATION_REGISTRY_ABI,
        functionName: 'submitFeedback',
        args: [BigInt(agentId), rating, comment],
        account: this.account,
      });

      const hash = await this.walletClient.writeContract(request);

      const receipt = await this.publicClient.waitForTransactionReceipt({
        hash,
      });

      // 提取 feedbackId
      const log = receipt.logs.find(
        (log: any) =>
          log.address.toLowerCase() === contractAddress.toLowerCase()
      );

      let feedbackId = '0';
      if (log && log.topics && log.topics[1]) {
        feedbackId = BigInt(log.topics[1]).toString();
      }

      logger.info('反馈提交成功', { feedbackId, txHash: hash });

      return { feedbackId, txHash: hash };
    } catch (error) {
      logger.error('提交反馈失败', error as Error);
      throw error;
    }
  }

  /**
   * 获取 Agent 信息（从链上）
   */
  async getAgent(agentId: string): Promise<Agent> {
    try {
      const contractAddress =
        CONTRACT_ADDRESSES[this.network].identityRegistry as Address;

      const result = await this.publicClient.readContract({
        address: contractAddress,
        abi: IDENTITY_REGISTRY_ABI,
        functionName: 'getAgent',
        args: [BigInt(agentId)],
      });

      const [owner, name, metadataStr, createdAt] = result as [
        string,
        string,
        string,
        bigint
      ];

      // 获取声誉分数
      const reputation = await this.getReputationScore(agentId);

      return {
        agentId,
        owner,
        name,
        metadata: JSON.parse(metadataStr),
        createdAt: Number(createdAt),
        reputation,
      };
    } catch (error) {
      const err = new Error(`获取 agent 信息失败: ${agentId}`);
      logger.error('获取 agent 信息失败', err);
      throw error;
    }
  }

  /**
   * 获取 Agent 的声誉分数
   */
  async getReputationScore(agentId: string) {
    try {
      const contractAddress =
        CONTRACT_ADDRESSES[this.network].reputationRegistry as Address;

      const result = await this.publicClient.readContract({
        address: contractAddress,
        abi: REPUTATION_REGISTRY_ABI,
        functionName: 'getReputationScore',
        args: [BigInt(agentId)],
      });

      const [averageRating, totalFeedbacks, totalInteractions] = result as [
        bigint,
        bigint,
        bigint
      ];

      return {
        averageRating: Number(averageRating) / 100, // 链上存储的是 * 100 的值
        totalFeedbacks: Number(totalFeedbacks),
        totalInteractions: Number(totalInteractions),
      };
    } catch (error) {
      const err = new Error(`获取声誉分数失败: ${agentId}`);
      logger.error('获取声誉分数失败', err);
      return {
        averageRating: 0,
        totalFeedbacks: 0,
        totalInteractions: 0,
      };
    }
  }

  /**
   * 搜索 Agents（使用 The Graph）
   */
  async searchAgents(params: {
    keyword?: string;
    tags?: string[];
    capabilities?: string[];
    minRating?: number;
    first?: number;
    skip?: number;
  }): Promise<Agent[]> {
    return this.graphClient.searchAgents(params);
  }

  /**
   * 获取所有 Agents（使用 The Graph）
   */
  async getAllAgents(params?: {
    first?: number;
    skip?: number;
    orderBy?: 'createdAt' | 'name';
    orderDirection?: 'asc' | 'desc';
  }): Promise<Agent[]> {
    return this.graphClient.getAllAgents(params);
  }

  /**
   * 获取热门 Agents
   */
  async getTrendingAgents(limit: number = 10): Promise<Agent[]> {
    return this.graphClient.getTrendingAgents(limit);
  }

  /**
   * 获取 Agent 的反馈列表
   */
  async getAgentFeedbacks(
    agentId: string,
    params?: { first?: number; skip?: number }
  ): Promise<Feedback[]> {
    return this.graphClient.getAgentFeedbacks(agentId, params);
  }

  /**
   * 获取平台统计数据
   */
  async getStats() {
    return this.graphClient.getStats();
  }

  /**
   * 根据拥有者地址获取 Agent ID
   */
  async getAgentIdByOwner(ownerAddress: string): Promise<string> {
    try {
      const contractAddress =
        CONTRACT_ADDRESSES[this.network].identityRegistry as Address;

      const agentId = await this.publicClient.readContract({
        address: contractAddress,
        abi: IDENTITY_REGISTRY_ABI,
        functionName: 'getAgentIdByOwner',
        args: [ownerAddress as Address],
      });

      return (agentId as bigint).toString();
    } catch (error) {
      const err = new Error(`获取 agent ID 失败: ${ownerAddress}`);
      logger.error('获取 agent ID 失败', err);
      throw error;
    }
  }
}
