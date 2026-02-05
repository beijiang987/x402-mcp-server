/**
 * ERC-8004 事件监听器
 *
 * 监听链上事件并更新本地数据库/缓存
 */

import { createPublicClient, http, parseAbiItem } from 'viem';
import { sepolia, mainnet, base } from 'viem/chains';
import { CONTRACT_ADDRESSES } from './contracts.js';
import { logger } from '../utils/logger.js';

const CHAINS = {
  sepolia: sepolia,
  mainnet: mainnet,
  base: base,
} as const;

export interface EventHandler {
  onNewRegistration?: (event: {
    agentId: string;
    owner: string;
    name: string;
    blockNumber: bigint;
    txHash: string;
  }) => void | Promise<void>;

  onMetadataUpdated?: (event: {
    agentId: string;
    metadata: string;
    blockNumber: bigint;
    txHash: string;
  }) => void | Promise<void>;

  onNewFeedback?: (event: {
    feedbackId: string;
    agentId: string;
    reviewer: string;
    rating: number;
    blockNumber: bigint;
    txHash: string;
  }) => void | Promise<void>;
}

export class ERC8004EventListener {
  private publicClient: any;
  private network: 'sepolia' | 'mainnet' | 'base';
  private isListening: boolean = false;
  private handlers: EventHandler = {};

  constructor(
    network: 'sepolia' | 'mainnet' | 'base' = 'sepolia',
    rpcUrl?: string
  ) {
    this.network = network;
    const chain = CHAINS[network];

    this.publicClient = createPublicClient({
      chain,
      transport: http(rpcUrl),
    });

    logger.info('ERC8004EventListener 初始化完成', { network });
  }

  /**
   * 设置事件处理器
   */
  setHandlers(handlers: EventHandler) {
    this.handlers = handlers;
  }

  /**
   * 开始监听所有事件
   */
  async startListening() {
    if (this.isListening) {
      logger.warn('事件监听器已在运行');
      return;
    }

    this.isListening = true;
    logger.info('开始监听 ERC-8004 事件');

    // 监听 NewRegistration 事件
    this.listenNewRegistration();

    // 监听 MetadataUpdated 事件
    this.listenMetadataUpdated();

    // 监听 NewFeedback 事件
    this.listenNewFeedback();
  }

  /**
   * 停止监听
   */
  stopListening() {
    this.isListening = false;
    logger.info('停止监听 ERC-8004 事件');
  }

  /**
   * 监听 NewRegistration 事件
   */
  private async listenNewRegistration() {
    const contractAddress = CONTRACT_ADDRESSES[this.network].identityRegistry;

    try {
      // 使用 watchEvent 监听新事件
      const unwatch = this.publicClient.watchEvent({
        address: contractAddress,
        event: parseAbiItem(
          'event NewRegistration(uint256 indexed agentId, address indexed owner, string name)'
        ),
        onLogs: async (logs: any[]) => {
          for (const log of logs) {
            if (!this.isListening) break;

            const { agentId, owner, name } = log.args as {
              agentId: bigint;
              owner: string;
              name: string;
            };

            logger.info('检测到新 Agent 注册', {
              agentId: agentId.toString(),
              owner,
              name,
            });

            if (this.handlers.onNewRegistration) {
              try {
                await this.handlers.onNewRegistration({
                  agentId: agentId.toString(),
                  owner,
                  name,
                  blockNumber: log.blockNumber,
                  txHash: log.transactionHash,
                });
              } catch (error) {
                logger.error('处理 NewRegistration 事件失败', error as Error);
              }
            }
          }
        },
      });

      // 在停止监听时取消订阅
      const checkInterval = setInterval(() => {
        if (!this.isListening) {
          unwatch();
          clearInterval(checkInterval);
        }
      }, 1000);
    } catch (error) {
      logger.error('监听 NewRegistration 事件失败', error as Error);
    }
  }

  /**
   * 监听 MetadataUpdated 事件
   */
  private async listenMetadataUpdated() {
    const contractAddress = CONTRACT_ADDRESSES[this.network].identityRegistry;

    try {
      const unwatch = this.publicClient.watchEvent({
        address: contractAddress,
        event: parseAbiItem(
          'event MetadataUpdated(uint256 indexed agentId, string metadata)'
        ),
        onLogs: async (logs: any[]) => {
          for (const log of logs) {
            if (!this.isListening) break;

            const { agentId, metadata } = log.args as {
              agentId: bigint;
              metadata: string;
            };

            logger.info('检测到元数据更新', {
              agentId: agentId.toString(),
            });

            if (this.handlers.onMetadataUpdated) {
              try {
                await this.handlers.onMetadataUpdated({
                  agentId: agentId.toString(),
                  metadata,
                  blockNumber: log.blockNumber,
                  txHash: log.transactionHash,
                });
              } catch (error) {
                logger.error('处理 MetadataUpdated 事件失败', error as Error);
              }
            }
          }
        },
      });

      const checkInterval = setInterval(() => {
        if (!this.isListening) {
          unwatch();
          clearInterval(checkInterval);
        }
      }, 1000);
    } catch (error) {
      logger.error('监听 MetadataUpdated 事件失败', error as Error);
    }
  }

  /**
   * 监听 NewFeedback 事件
   */
  private async listenNewFeedback() {
    const contractAddress =
      CONTRACT_ADDRESSES[this.network].reputationRegistry;

    try {
      const unwatch = this.publicClient.watchEvent({
        address: contractAddress,
        event: parseAbiItem(
          'event NewFeedback(uint256 indexed feedbackId, uint256 indexed agentId, address indexed reviewer, uint8 rating)'
        ),
        onLogs: async (logs: any[]) => {
          for (const log of logs) {
            if (!this.isListening) break;

            const { feedbackId, agentId, reviewer, rating } = log.args as {
              feedbackId: bigint;
              agentId: bigint;
              reviewer: string;
              rating: number;
            };

            logger.info('检测到新反馈', {
              feedbackId: feedbackId.toString(),
              agentId: agentId.toString(),
              rating,
            });

            if (this.handlers.onNewFeedback) {
              try {
                await this.handlers.onNewFeedback({
                  feedbackId: feedbackId.toString(),
                  agentId: agentId.toString(),
                  reviewer,
                  rating,
                  blockNumber: log.blockNumber,
                  txHash: log.transactionHash,
                });
              } catch (error) {
                logger.error('处理 NewFeedback 事件失败', error as Error);
              }
            }
          }
        },
      });

      const checkInterval = setInterval(() => {
        if (!this.isListening) {
          unwatch();
          clearInterval(checkInterval);
        }
      }, 1000);
    } catch (error) {
      logger.error('监听 NewFeedback 事件失败', error as Error);
    }
  }

  /**
   * 获取历史事件（从指定区块开始）
   */
  async getHistoricalEvents(fromBlock: bigint, toBlock: bigint | 'latest') {
    logger.info('获取历史事件', { fromBlock, toBlock });

    const identityAddress = CONTRACT_ADDRESSES[this.network].identityRegistry;
    const reputationAddress =
      CONTRACT_ADDRESSES[this.network].reputationRegistry;

    try {
      // 获取 NewRegistration 事件
      const registrationLogs = await this.publicClient.getLogs({
        address: identityAddress,
        event: parseAbiItem(
          'event NewRegistration(uint256 indexed agentId, address indexed owner, string name)'
        ),
        fromBlock,
        toBlock,
      });

      // 获取 NewFeedback 事件
      const feedbackLogs = await this.publicClient.getLogs({
        address: reputationAddress,
        event: parseAbiItem(
          'event NewFeedback(uint256 indexed feedbackId, uint256 indexed agentId, address indexed reviewer, uint8 rating)'
        ),
        fromBlock,
        toBlock,
      });

      return {
        registrations: registrationLogs.map((log: any) => ({
          agentId: log.args.agentId.toString(),
          owner: log.args.owner,
          name: log.args.name,
          blockNumber: log.blockNumber,
          txHash: log.transactionHash,
        })),
        feedbacks: feedbackLogs.map((log: any) => ({
          feedbackId: log.args.feedbackId.toString(),
          agentId: log.args.agentId.toString(),
          reviewer: log.args.reviewer,
          rating: log.args.rating,
          blockNumber: log.blockNumber,
          txHash: log.transactionHash,
        })),
      };
    } catch (error) {
      logger.error('获取历史事件失败', error as Error);
      throw error;
    }
  }
}
