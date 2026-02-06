/**
 * ERC-8004 事件索引器
 *
 * 监听链上事件并同步到数据库：
 * - IdentityRegistry.Registered
 * - ReputationRegistry.NewFeedback
 * - ValidationRegistry.ValidationResponse
 */

import { createPublicClient, http, parseAbiItem, type Log } from 'viem';
import { sepolia, mainnet } from 'viem/chains';
import { DatabaseService } from '../database/database-service.js';
import { CacheService } from '../cache/cache-service.js';
import IdentityRegistryABI from './abis/IdentityRegistry.json' with { type: 'json' };
import ReputationRegistryABI from './abis/ReputationRegistry.json' with { type: 'json' };

/**
 * 事件索引器配置
 */
export interface IndexerConfig {
  network: 'sepolia' | 'mainnet';
  rpcUrl: string;
  startBlock?: bigint;
  pollInterval?: number; // ms
  batchSize?: number; // 每次查询的块数
}

/**
 * 事件索引器
 */
export class EventIndexer {
  private client: any;
  private db: DatabaseService;
  private config: IndexerConfig;
  private isRunning: boolean = false;
  private currentBlock: bigint;

  constructor(config: IndexerConfig, db: DatabaseService) {
    this.config = {
      pollInterval: 30000, // 30 秒
      batchSize: 1000, // 1000 块
      ...config,
    };

    this.db = db;
    this.currentBlock = config.startBlock || 0n;

    // 创建 RPC 客户端
    this.client = createPublicClient({
      chain: config.network === 'sepolia' ? sepolia : mainnet,
      transport: http(config.rpcUrl),
    });
  }

  /**
   * 启动索引器
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('Indexer already running');
      return;
    }

    this.isRunning = true;
    console.log(`🚀 Starting event indexer for ${this.config.network}...`);

    // 获取起始区块
    if (this.currentBlock === 0n) {
      // 从数据库加载上次同步的区块
      // TODO: 实现从 sync_status 表读取
      this.currentBlock = await this.client.getBlockNumber();
    }

    // 开始轮询
    this.poll();
  }

  /**
   * 停止索引器
   */
  stop(): void {
    this.isRunning = false;
    console.log(`🛑 Stopping event indexer for ${this.config.network}...`);
  }

  /**
   * 轮询新区块
   */
  private async poll(): Promise<void> {
    while (this.isRunning) {
      try {
        await this.indexNewBlocks();
      } catch (error) {
        console.error('Indexing error:', error);
      }

      // 等待下一轮
      await new Promise((resolve) => setTimeout(resolve, this.config.pollInterval));
    }
  }

  /**
   * 索引新区块
   */
  private async indexNewBlocks(): Promise<void> {
    const latestBlock = await this.client.getBlockNumber();

    if (latestBlock <= this.currentBlock) {
      return; // 没有新区块
    }

    const toBlock = BigInt(Math.min(
      Number(this.currentBlock) + this.config.batchSize!,
      Number(latestBlock)
    ));

    console.log(
      `📦 Indexing blocks ${this.currentBlock} to ${toBlock} (${this.config.network})`
    );

    // 索引 Registered 事件
    await this.indexRegisteredEvents(this.currentBlock, toBlock);

    // 索引 NewFeedback 事件
    await this.indexNewFeedbackEvents(this.currentBlock, toBlock);

    // 更新当前区块
    this.currentBlock = toBlock + 1n;

    // TODO: 保存到 sync_status 表
  }

  /**
   * 索引 Registered 事件
   */
  private async indexRegisteredEvents(fromBlock: bigint, toBlock: bigint): Promise<void> {
    try {
      const contractAddress = this.getContractAddress('IdentityRegistry');

      const logs = await this.client.getLogs({
        address: contractAddress,
        event: parseAbiItem('event Registered(uint256 indexed agentId, address indexed owner, string agentURI)'),
        fromBlock,
        toBlock,
      });

      console.log(`  Found ${logs.length} Registered events`);

      for (const log of logs) {
        await this.processRegisteredEvent(log);
      }
    } catch (error) {
      console.error('Failed to index Registered events:', error);
    }
  }

  /**
   * 处理 Registered 事件
   */
  private async processRegisteredEvent(log: Log): Promise<void> {
    try {
      const { agentId, owner, agentURI } = log.args as any;

      // 解析元数据
      const metadata = await this.parseMetadata(agentURI);

      // 插入数据库
      await this.db.upsertAgent({
        agent_id: agentId.toString(),
        owner_address: owner,
        agent_uri: agentURI,
        network: this.config.network,
        name: metadata?.name,
        description: metadata?.description,
        image: metadata?.image,
        domains: metadata?.domains,
        skills: metadata?.skills,
        capabilities: metadata?.capabilities,
        services: metadata?.services,
        x402_support: metadata?.x402Support,
        created_at: new Date(),
      });

      console.log(`  ✅ Indexed Agent ${agentId}`);

      // 清除缓存
      await CacheService.invalidateAgent(agentId.toString(), this.config.network);
    } catch (error) {
      console.error('Failed to process Registered event:', error);
    }
  }

  /**
   * 索引 NewFeedback 事件
   */
  private async indexNewFeedbackEvents(fromBlock: bigint, toBlock: bigint): Promise<void> {
    try {
      const contractAddress = this.getContractAddress('ReputationRegistry');

      const logs = await this.client.getLogs({
        address: contractAddress,
        // TODO: 使用正确的 NewFeedback 事件签名
        fromBlock,
        toBlock,
      });

      console.log(`  Found ${logs.length} NewFeedback events`);

      for (const log of logs) {
        await this.processNewFeedbackEvent(log);
      }
    } catch (error) {
      console.error('Failed to index NewFeedback events:', error);
    }
  }

  /**
   * 处理 NewFeedback 事件
   */
  private async processNewFeedbackEvent(log: Log): Promise<void> {
    try {
      // TODO: 解析事件参数并插入数据库
      // TODO: 触发声誉评分重新计算
      // TODO: 清除缓存
    } catch (error) {
      console.error('Failed to process NewFeedback event:', error);
    }
  }

  /**
   * 解析元数据 URI
   */
  private async parseMetadata(uri: string): Promise<any> {
    try {
      if (uri.startsWith('data:')) {
        const base64 = uri.replace('data:application/json;base64,', '');
        const json = Buffer.from(base64, 'base64').toString('utf-8');
        return JSON.parse(json);
      }

      if (uri.startsWith('ipfs://')) {
        const cid = uri.replace('ipfs://', '');
        const response = await fetch(`https://ipfs.io/ipfs/${cid}`);
        return await response.json();
      }

      if (uri.startsWith('http')) {
        const response = await fetch(uri);
        return await response.json();
      }

      return null;
    } catch (error) {
      console.error('Failed to parse metadata:', error);
      return null;
    }
  }

  /**
   * 获取合约地址
   */
  private getContractAddress(contract: 'IdentityRegistry' | 'ReputationRegistry'): string {
    // TODO: 从配置读取
    const addresses = {
      sepolia: {
        IdentityRegistry: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
        ReputationRegistry: '0x8004B663056A597Dffe9eCcC1965A193B7388713',
      },
      mainnet: {
        IdentityRegistry: '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
        ReputationRegistry: '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63',
      },
    };

    return addresses[this.config.network][contract];
  }
}
