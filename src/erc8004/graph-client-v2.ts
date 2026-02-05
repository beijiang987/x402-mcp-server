/**
 * The Graph Subgraph 客户端 - 修复版
 *
 * ⚠️ 重要: Subgraph URL 必须从官方获取，不能猜测
 *
 * 获取正确 URL 的方法:
 * 1. 访问 https://thegraph.com/explorer
 * 2. 搜索 "erc8004" 或 "trustless agents"
 * 3. 找到 Agent0 团队维护的官方 Subgraph
 * 4. 复制 Query URL
 *
 * 或者询问官方社区:
 * - 8004scan.io 文档
 * - ERC-8004 Discord/Telegram
 * - GitHub Issues
 */

import { GraphQLClient } from 'graphql-request';
import type { Agent, Feedback, Validation } from './contracts-v2.js';

// ============================================
// Subgraph URL 配置
// ============================================

/**
 * ✅ 官方 Subgraph URLs
 *
 * 来源: github.com/agent0lab/agent0-ts (Agent0 官方 SDK)
 * 这些是 The Graph 去中心化网络的 Gateway URLs
 *
 * The Graph 正在维护 ERC-8004 Subgraphs，覆盖 8 条区块链
 * 与 Agent0 团队合作（Agent0 是 ERC-8004 标准作者背后的项目）
 */
const SUBGRAPH_URLS: Record<string, string> = {
  // Ethereum Sepolia (ChainId: 11155111)
  sepolia:
    'https://gateway.thegraph.com/api/00a452ad3cd1900273ea62c1bf283f93/subgraphs/id/6wQRC7geo9XYAhckfmfo8kbMRLeWU8KQd3XsJqFKmZLT',

  // Ethereum Mainnet (ChainId: 1)
  mainnet:
    'https://gateway.thegraph.com/api/7fd2e7d89ce3ef24cd0d4590298f0b2c/subgraphs/id/FV6RR6y13rsnCxBAicKuQEwDp8ioEGiNaWaZUmvr1F8k',

  // Polygon Mainnet (ChainId: 137)
  polygon:
    'https://gateway.thegraph.com/api/782d61ed390e625b8867995389699b4c/subgraphs/id/9q16PZv1JudvtnCAf44cBoxg82yK9SSsFvrjCY9xnneF',

  // ⚠️ Base 和其他链的 Subgraph 可能尚未部署
  // 如需支持更多链，请查看 Agent0 SDK 更新或联系 team@8004.org
};

/**
 * ERC-8004 Graph 客户端
 */
export class ERC8004GraphClient {
  private client: GraphQLClient;
  private network: string;

  constructor(network: string = 'sepolia') {
    const url = SUBGRAPH_URLS[network];

    if (!url || url.startsWith('TODO')) {
      throw new Error(
        `❌ Subgraph URL for ${network} not configured.\n\n` +
          `获取正确 URL 的步骤:\n` +
          `1. 访问 https://thegraph.com/explorer\n` +
          `2. 搜索 "erc8004" 或 "trustless agents"\n` +
          `3. 复制 Query URL 并更新 SUBGRAPH_URLS\n\n` +
          `或者使用 RPC 备选方案（见 getAgentsFromRPC）`
      );
    }

    this.client = new GraphQLClient(url);
    this.network = network;
  }

  /**
   * 查询 Agents
   *
   * ⚠️ 字段名必须与实际 Subgraph Schema 一致
   *
   * 正确做法:
   * 1. 打开 Subgraph Playground
   * 2. 查看 Schema 标签
   * 3. 按照实际 Entity 和字段编写查询
   *
   * 常见 Entity 可能是:
   * - Agent (id, agentId, owner, uri, createdAt, ...)
   * - Feedback (id, agentId, clientAddress, value, valueDecimals, tag1, tag2, ...)
   * - Validation (id, agentId, validatorAddress, success, ...)
   */
  async getAgents(first: number = 100, skip: number = 0): Promise<any[]> {
    // TODO: 确认实际 schema 后替换字段名
    const query = `
      query GetAgents($first: Int!, $skip: Int!) {
        # ⚠️ 字段名需要对照实际 Subgraph Schema
        # 不要猜测字段名！
        agents(first: $first, skip: $skip, orderBy: createdAt, orderDirection: desc) {
          id
          agentId
          owner
          # uri 或 tokenURI 或 agentURI? 查看 schema
          # createdAt
          # metadata 可能需要链下解析
        }
      }
    `;

    try {
      const data = await this.client.request<{ agents: any[] }>(query, {
        first,
        skip,
      });
      return data.agents;
    } catch (error: any) {
      console.error('GraphQL 查询失败:', error.message);
      console.log('可能原因:');
      console.log('- Subgraph URL 不正确');
      console.log('- 字段名与 schema 不匹配');
      console.log('- Subgraph 索引未完成');
      throw error;
    }
  }

  /**
   * 查询 Feedbacks
   *
   * TODO: 根据实际 schema 实现
   */
  async getFeedbacks(
    agentId: string,
    first: number = 50,
    skip: number = 0
  ): Promise<any[]> {
    // TODO: 实现
    throw new Error('未实现 - 需要对照 schema 编写查询');
  }

  /**
   * 查询 Validations
   *
   * TODO: 根据实际 schema 实现
   */
  async getValidations(agentId: string): Promise<any[]> {
    // TODO: 实现
    throw new Error('未实现 - 需要对照 schema 编写查询');
  }

  // ============================================
  // 备选方案: 直接用 RPC 查询事件
  // ============================================

  /**
   * 不依赖 The Graph 的 RPC 备选方案
   *
   * 优点: 不依赖第三方索引服务
   * 缺点: 需要自己索引和缓存
   *
   * 使用方法:
   *   import { createPublicClient, http, parseAbiItem } from 'viem';
   *   const publicClient = createPublicClient({ chain: sepolia, transport: http(RPC_URL) });
   *   const agents = await getAgentsFromRPC(publicClient, CONTRACT_ADDRESS);
   */
  static async getAgentsFromRPC(
    publicClient: any,
    identityRegistry: string
  ): Promise<any[]> {
    // TODO: 从官方 ABI 获取事件签名
    // 可能是 event Registered(uint256 indexed agentId, address indexed owner, string agentURI)

    /*
    import { parseAbiItem } from 'viem';

    const logs = await publicClient.getLogs({
      address: identityRegistry as `0x${string}`,
      event: parseAbiItem('event Registered(uint256 indexed agentId, address indexed owner, string agentURI)'),
      fromBlock: 'earliest', // 或指定起始块
      toBlock: 'latest',
    });

    return logs.map(log => ({
      agentId: log.args.agentId.toString(),
      owner: log.args.owner,
      uri: log.args.agentURI,
      blockNumber: log.blockNumber,
      txHash: log.transactionHash,
    }));
    */

    throw new Error('未实现 - 需要真实的事件 ABI');
  }
}

/**
 * 辅助函数: 检查 Subgraph 健康状态
 */
export async function checkSubgraphHealth(
  network: string
): Promise<{ healthy: boolean; message: string }> {
  const url = SUBGRAPH_URLS[network];

  if (!url || url.startsWith('TODO')) {
    return {
      healthy: false,
      message: `Subgraph URL 未配置 (${network})`,
    };
  }

  try {
    const client = new GraphQLClient(url);
    // 简单查询测试连接
    await client.request(`{ _meta { block { number } } }`);
    return {
      healthy: true,
      message: 'Subgraph 可用',
    };
  } catch (error: any) {
    return {
      healthy: false,
      message: `Subgraph 不可用: ${error.message}`,
    };
  }
}
