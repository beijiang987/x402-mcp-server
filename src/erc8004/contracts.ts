/**
 * ERC-8004 合约 ABI 和地址配置
 *
 * ERC-8004 是 AI Agent 的链上身份和声誉管理标准
 * 官方规范: https://eips.ethereum.org/EIPS/eip-8004
 */

// IdentityRegistry 合约 ABI
export const IDENTITY_REGISTRY_ABI = [
  // 注册新 agent
  {
    name: 'register',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'name', type: 'string' },
      { name: 'metadata', type: 'string' }, // JSON metadata
    ],
    outputs: [{ name: 'agentId', type: 'uint256' }],
  },
  // 更新 agent 元数据
  {
    name: 'updateMetadata',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'metadata', type: 'string' },
    ],
    outputs: [],
  },
  // 获取 agent 信息
  {
    name: 'getAgent',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agentId', type: 'uint256' }],
    outputs: [
      { name: 'owner', type: 'address' },
      { name: 'name', type: 'string' },
      { name: 'metadata', type: 'string' },
      { name: 'createdAt', type: 'uint256' },
    ],
  },
  // 获取地址拥有的 agent ID
  {
    name: 'getAgentIdByOwner',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: 'agentId', type: 'uint256' }],
  },
  // 事件: 新 agent 注册
  {
    name: 'NewRegistration',
    type: 'event',
    inputs: [
      { name: 'agentId', type: 'uint256', indexed: true },
      { name: 'owner', type: 'address', indexed: true },
      { name: 'name', type: 'string', indexed: false },
    ],
  },
  // 事件: 元数据更新
  {
    name: 'MetadataUpdated',
    type: 'event',
    inputs: [
      { name: 'agentId', type: 'uint256', indexed: true },
      { name: 'metadata', type: 'string', indexed: false },
    ],
  },
] as const;

// ReputationRegistry 合约 ABI
export const REPUTATION_REGISTRY_ABI = [
  // 提交反馈
  {
    name: 'submitFeedback',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'rating', type: 'uint8' }, // 1-5 星评分
      { name: 'comment', type: 'string' },
    ],
    outputs: [{ name: 'feedbackId', type: 'uint256' }],
  },
  // 获取 agent 的声誉分数
  {
    name: 'getReputationScore',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agentId', type: 'uint256' }],
    outputs: [
      { name: 'averageRating', type: 'uint256' }, // 平均评分 * 100
      { name: 'totalFeedbacks', type: 'uint256' },
      { name: 'totalInteractions', type: 'uint256' },
    ],
  },
  // 获取反馈详情
  {
    name: 'getFeedback',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'feedbackId', type: 'uint256' }],
    outputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'reviewer', type: 'address' },
      { name: 'rating', type: 'uint8' },
      { name: 'comment', type: 'string' },
      { name: 'timestamp', type: 'uint256' },
    ],
  },
  // 事件: 新反馈
  {
    name: 'NewFeedback',
    type: 'event',
    inputs: [
      { name: 'feedbackId', type: 'uint256', indexed: true },
      { name: 'agentId', type: 'uint256', indexed: true },
      { name: 'reviewer', type: 'address', indexed: true },
      { name: 'rating', type: 'uint8', indexed: false },
    ],
  },
] as const;

// ValidationRegistry 合约 ABI
// 提供 agent 验证服务的第三方注册表
export const VALIDATION_REGISTRY_ABI = [
  // 请求验证
  {
    name: 'validationRequest',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'validationType', type: 'string' }, // 验证类型（如 'kyc', 'audit', 'performance'）
      { name: 'metadata', type: 'string' }, // 验证相关元数据
    ],
    outputs: [{ name: 'requestId', type: 'uint256' }],
  },
  // 提交验证结果
  {
    name: 'validationResponse',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'requestId', type: 'uint256' },
      { name: 'passed', type: 'bool' },
      { name: 'report', type: 'string' }, // 验证报告 URI
    ],
    outputs: [],
  },
  // 获取验证状态
  {
    name: 'getValidationStatus',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agentId', type: 'uint256' }],
    outputs: [
      { name: 'isValidated', type: 'bool' },
      { name: 'validationType', type: 'string' },
      { name: 'validatedAt', type: 'uint256' },
    ],
  },
  // 事件: 新验证请求
  {
    name: 'ValidationRequested',
    type: 'event',
    inputs: [
      { name: 'requestId', type: 'uint256', indexed: true },
      { name: 'agentId', type: 'uint256', indexed: true },
      { name: 'validationType', type: 'string', indexed: false },
    ],
  },
  // 事件: 验证完成
  {
    name: 'ValidationCompleted',
    type: 'event',
    inputs: [
      { name: 'requestId', type: 'uint256', indexed: true },
      { name: 'agentId', type: 'uint256', indexed: true },
      { name: 'passed', type: 'bool', indexed: false },
    ],
  },
] as const;

// ⚠️ 重要：合约地址配置
// 来源: https://github.com/erc-8004/erc-8004-contracts
// 官方部署地址 - 请勿修改！
export const CONTRACT_ADDRESSES = {
  // Sepolia 测试网 - 官方已部署
  sepolia: {
    identityRegistry: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
    reputationRegistry: '0x8004B663056A597Dffe9eCcC1965A193B7388713',
    validationRegistry: '0x0000000000000000000000000000000000000000', // 待补充官方地址
  },
  // 以太坊主网 - 官方已部署
  mainnet: {
    identityRegistry: '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
    reputationRegistry: '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63',
    validationRegistry: '0x0000000000000000000000000000000000000000', // 待补充官方地址
  },
  // Base Sepolia 测试网 - 待确认官方地址
  'base-sepolia': {
    identityRegistry: '0x0000000000000000000000000000000000000000',
    reputationRegistry: '0x0000000000000000000000000000000000000000',
    validationRegistry: '0x0000000000000000000000000000000000000000',
  },
  // Base 主网 - 待确认官方地址
  base: {
    identityRegistry: '0x0000000000000000000000000000000000000000',
    reputationRegistry: '0x0000000000000000000000000000000000000000',
    validationRegistry: '0x0000000000000000000000000000000000000000',
  },
} as const;

// Agent 元数据接口
export interface AgentMetadata {
  name: string;
  description: string;
  capabilities: string[];
  apiEndpoint?: string;
  pricing?: {
    model: 'per-call' | 'subscription' | 'usage-based';
    amount: string;
    currency: string;
  };
  tags?: string[];
  version?: string;
  contacts?: {
    website?: string;
    github?: string;
    twitter?: string;
  };
}

// Agent 信息接口
export interface Agent {
  agentId: string;
  owner: string;
  name: string;
  metadata: AgentMetadata;
  createdAt: number;
  reputation?: ReputationScore;
}

// 声誉分数接口
export interface ReputationScore {
  averageRating: number; // 0-5
  totalFeedbacks: number;
  totalInteractions: number;
}

// 反馈接口
export interface Feedback {
  feedbackId: string;
  agentId: string;
  reviewer: string;
  rating: number; // 1-5
  comment: string;
  timestamp: number;
}
