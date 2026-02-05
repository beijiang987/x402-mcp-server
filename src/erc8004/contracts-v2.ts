/**
 * ERC-8004 合约配置 - 官方规范版本
 *
 * ⚠️ 重要：
 * 1. ABI 必须从官方仓库复制，不能手写或 AI 生成
 * 2. 类型定义严格遵循 EIP-8004 规范
 * 3. 合约地址来源: github.com/erc-8004/erc-8004-contracts
 */

// ============================================
// 1. 从官方仓库导入 ABI（不要手写）
// ============================================

// ✅ 已从官方仓库获取 ABI 文件: github.com/erc-8004/erc-8004-contracts
// 注意：官方文件名是 IdentityRegistry.json（不是 IdentityRegistryUpgradeable.json）
// 使用 import attributes（NodeNext 模块系统要求的新语法）
import IdentityRegistryABI from './abis/IdentityRegistry.json' with { type: 'json' };
import ReputationRegistryABI from './abis/ReputationRegistry.json' with { type: 'json' };
import ValidationRegistryABI from './abis/ValidationRegistry.json' with { type: 'json' };

export { IdentityRegistryABI, ReputationRegistryABI, ValidationRegistryABI };

// ============================================
// 2. 合约地址 — 来源: github.com/erc-8004/erc-8004-contracts
// ============================================

export const CONTRACT_ADDRESSES = {
  // Ethereum Sepolia (测试网) - 官方已部署
  sepolia: {
    IdentityRegistry: '0x8004A818BFB912233c491871b3d84c89A494BD9e' as const,
    ReputationRegistry: '0x8004B663056A597Dffe9eCcC1965A193B7388713' as const,
    ValidationRegistry: '' as const, // TODO: 从官方仓库确认地址
  },
  // Ethereum Mainnet - 官方已部署
  mainnet: {
    IdentityRegistry: '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432' as const,
    ReputationRegistry: '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63' as const,
    ValidationRegistry: '' as const, // TODO: 从官方仓库确认地址
  },
  // Base Sepolia - 需要从官方仓库确认
  'base-sepolia': {
    IdentityRegistry: '' as const, // TODO: 从官方确认
    ReputationRegistry: '' as const,
    ValidationRegistry: '' as const,
  },
  // Base Mainnet - 需要从官方仓库确认
  base: {
    IdentityRegistry: '' as const, // TODO: 从官方确认
    ReputationRegistry: '' as const,
    ValidationRegistry: '' as const,
  },
} as const;

export type NetworkName = keyof typeof CONTRACT_ADDRESSES;

// ============================================
// 3. 类型定义 — 严格遵循 ERC-8004 规范
// ============================================

/**
 * Agent Registration File (官方规范 v1)
 * 来源: https://eips.ethereum.org/EIPS/eip-8004
 *
 * 这是官方要求的注册文件结构，不是自创的。
 */
export interface AgentRegistrationFile {
  // 必须字段 - 标识符
  type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1';

  // 基本信息
  name: string;
  description: string;
  image: string;

  // 服务端点数组（A2A, MCP, OASF 等）
  services: AgentService[];

  // x402 支付支持
  x402Support: boolean;

  // 活跃状态
  active: boolean;

  // 跨链注册信息
  registrations: AgentRegistration[];
}

/**
 * Agent Service 端点
 */
export interface AgentService {
  name: 'web' | 'A2A' | 'MCP' | 'OASF' | 'ENS' | 'DID' | 'email' | 'agentWallet' | string;
  endpoint: string;
  version?: string;

  // OASF 特定字段
  skills?: string[];
  domains?: string[];

  // MCP 特定字段
  capabilities?: Record<string, any>;
}

/**
 * 跨链注册信息
 */
export interface AgentRegistration {
  agentId: number;
  agentRegistry: string; // 格式: eip155:{chainId}:{registryAddress}
}

/**
 * 链上元数据条目
 * 来源: nuwa-protocol/nuwa-8004 参考实现
 *
 * 官方 register() 函数接受 MetadataEntry[] 参数。
 * 这个结构在之前的代码中完全缺失。
 */
export interface MetadataEntry {
  key: string; // 如 "agentName", "agentWallet"
  value: `0x${string}`; // bytes 编码
}

/**
 * 声誉反馈 — 官方结构
 *
 * ⚠️ 重要变化：
 * - value: int128（有符号整数，支持负面反馈）
 * - valueDecimals: uint8 (0-18) 精度
 * - 支持 tag1, tag2 用于分领域评分
 * - 支持 dataURI + dataHash 链下详情
 *
 * 之前的代码错误地使用 uint8 (1-5) 评分。
 */
export interface FeedbackData {
  agentId: number;
  value: bigint; // int128，不是简单的 1-5 评分
  valueDecimals: number; // uint8, 0-18
  tag1?: string; // 分领域标签（如 "code-quality"）
  tag2?: string; // 第二个标签（如 "response-time"）
  endpoint?: string; // 评价的具体端点
  dataURI?: string; // 链下详情 URI (推荐 IPFS)
  dataHash?: `0x${string}`; // KECCAK-256 哈希
}

/**
 * 反馈授权 — 防垃圾机制
 *
 * 官方要求：server agent 先签名授权，client 才能提交反馈。
 * 这是 ERC-8004 的反 Sybil 核心机制。
 *
 * 之前的代码没有实现这个关键功能。
 */
export interface FeedbackAuth {
  agentId: number;
  clientAddress: `0x${string}`;
  indexLimit: number; // 允许提交的反馈数量上限
  expiry: number; // Unix timestamp
  chainId: number;
  identityRegistry: `0x${string}`;
  signerAddress: `0x${string}`;
}

/**
 * 验证请求 — Validation Registry
 */
export interface ValidationRequest {
  validatorAddress: `0x${string}`;
  agentId: number;
  requestURI: string; // 验证请求详情 URI
  requestHash: `0x${string}`; // KECCAK-256 哈希
}

/**
 * 验证响应 — Validation Registry
 */
export interface ValidationResponse {
  requestHash: `0x${string}`;
  success: boolean;
  responseURI: string; // 验证结果详情 URI
  responseHash: `0x${string}`; // KECCAK-256 哈希
  tag: string; // 验证类型标签（如 "kyc", "audit"）
}

/**
 * Agent 信息（简化版，用于查询）
 */
export interface Agent {
  agentId: string;
  owner: `0x${string}`;
  uri: string; // agentURI 指向 AgentRegistrationFile
  createdAt: number;
  // 注意：metadata 需要从 uri 链下解析
}

/**
 * 反馈信息（简化版，用于查询）
 */
export interface Feedback {
  feedbackId: string;
  agentId: string;
  clientAddress: `0x${string}`;
  value: bigint; // int128
  valueDecimals: number;
  tag1?: string;
  tag2?: string;
  dataURI?: string;
  timestamp: number;
}

/**
 * 验证信息（简化版，用于查询）
 */
export interface Validation {
  requestHash: `0x${string}`;
  validatorAddress: `0x${string}`;
  agentId: string;
  success: boolean;
  tag: string;
  timestamp: number;
}

// ============================================
// 4. 辅助常量
// ============================================

/**
 * USDC 合约地址（x402 支付用）
 */
export const USDC_ADDRESSES = {
  base: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const,
  'base-sepolia': '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as const,
  sepolia: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' as const,
  mainnet: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as const,
} as const;

/**
 * x402 定价配置（USDC，6 位小数）
 *
 * ⚠️ 之前错误地使用 ETH 定价
 */
export const PRICING = {
  premiumSearch: '100' as const, // 0.0001 USDC
  batchQuery: '500' as const, // 0.0005 USDC
  dataExport: '1000' as const, // 0.001 USDC
  detailedAnalysis: '5000' as const, // 0.005 USDC
  validationRequest: '10000' as const, // 0.01 USDC
} as const;
