/**
 * x402 支付中间件 — 链上验证实现（使用 USDC）
 *
 * 参考官方文档:
 * - https://docs.cdp.coinbase.com/x402/welcome
 * - https://github.com/coinbase/x402
 * - https://github.com/google-agentic-commerce/a2a-x402
 *
 * 实现方式:
 * 1. 基础版：链上验证（当前实现）
 * 2. 高级版：Facilitator 签名验证（TODO）
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createPublicClient, http } from 'viem';
import { base, baseSepolia, mainnet, sepolia } from 'viem/chains';
import { kv } from '@vercel/kv';
import { USDC_ADDRESSES, PRICING } from '../erc8004/contracts-v2.js';

// Chain 配置映射
const CHAIN_CONFIG = {
  base: { chain: base, rpcKey: 'BASE_RPC_URL' },
  'base-sepolia': { chain: baseSepolia, rpcKey: 'BASE_SEPOLIA_RPC_URL' },
  mainnet: { chain: mainnet, rpcKey: 'MAINNET_RPC_URL' },
  sepolia: { chain: sepolia, rpcKey: 'RPC_URL' },
} as const;

type SupportedNetwork = keyof typeof CHAIN_CONFIG;

/**
 * X-Payment header 格式
 */
interface PaymentProof {
  v: number; // 版本号
  txHash: `0x${string}`; // 交易哈希
  network: SupportedNetwork; // 网络名称
}

/**
 * 验证结果
 */
interface VerificationResult {
  success: boolean;
  error?: string;
  details?: {
    txHash: string;
    from: string;
    to: string;
    amount: string;
    amountUSDC: number;
  };
}

// ============================================
// x402 支付配置
// ============================================

/**
 * 获取 x402 支付要求对象
 */
export function getPaymentRequirement(
  priceKey: keyof typeof PRICING,
  network: keyof typeof USDC_ADDRESSES = 'base-sepolia',
  resourceUrl: string
) {
  return {
    version: '1.0',
    accepts: [
      {
        scheme: 'exact' as const,
        network: network,
        maxAmountRequired: PRICING[priceKey],
        asset: USDC_ADDRESSES[network],
        payTo: process.env.X402_RECEIVE_ADDRESS || '0x0000000000000000000000000000000000000000',
        resource: resourceUrl,
      },
    ],
    description: `Payment required for ${priceKey}`,
  };
}

/**
 * x402 支付验证中间件（Vercel Serverless）
 *
 * 用法:
 *   if (!requirePayment(req, res, 'premiumSearch')) return;
 *   // 支付已验证，继续处理请求...
 */
export async function requirePayment(
  req: VercelRequest,
  res: VercelResponse,
  priceKey: keyof typeof PRICING,
  network: keyof typeof USDC_ADDRESSES = 'base-sepolia'
): Promise<boolean> {
  const paymentHeader = req.headers['x-payment'] as string | undefined;

  const resourceUrl = `${req.headers.host}${req.url}`;

  // 如果没有支付 header，返回 402 + 支付要求
  if (!paymentHeader) {
    const requirement = getPaymentRequirement(priceKey, network, resourceUrl);

    res.status(402).json({
      error: 'Payment Required',
      x402: requirement,
    });

    return false;
  }

  // 解析 X-Payment header
  let paymentProof: PaymentProof;
  try {
    paymentProof = JSON.parse(paymentHeader);

    // 验证格式
    if (!paymentProof.v || !paymentProof.txHash || !paymentProof.network) {
      throw new Error('Invalid payment proof format');
    }

    // 验证版本
    if (paymentProof.v !== 1) {
      throw new Error(`Unsupported payment proof version: ${paymentProof.v}`);
    }

    // 验证网络
    if (!CHAIN_CONFIG[paymentProof.network]) {
      throw new Error(`Unsupported network: ${paymentProof.network}`);
    }
  } catch (error: any) {
    res.status(400).json({
      error: 'Invalid X-Payment header',
      message: error.message,
      expected: '{"v": 1, "txHash": "0x...", "network": "base"}',
    });
    return false;
  }

  // 检查 Vercel KV 是否可用
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    console.error('❌ Vercel KV 未配置，无法验证付费请求');
    console.error('   需要环境变量: KV_REST_API_URL, KV_REST_API_TOKEN');
    res.status(503).json({
      error: 'Payment verification unavailable',
      message: 'KV storage not configured',
    });
    return false;
  }

  // 验证支付
  const requirement = getPaymentRequirement(priceKey, network, resourceUrl);
  const result = await verifyOnChainPayment(paymentProof, requirement);

  if (!result.success) {
    res.status(403).json({
      error: 'Payment verification failed',
      message: result.error,
    });
    return false;
  }

  return true;
}

/**
 * 链上支付验证（主要实现）
 */
async function verifyOnChainPayment(
  proof: PaymentProof,
  requirement: any
): Promise<VerificationResult> {
  const { txHash, network } = proof;
  const requiredAmount = requirement.accepts[0].maxAmountRequired;
  const receiveAddress = requirement.accepts[0].payTo.toLowerCase();
  const usdcAddress = USDC_ADDRESSES[network as keyof typeof USDC_ADDRESSES];

  // 1. 检查 tx hash 是否已被使用
  const kvKey = `used_tx:${network}:${txHash}`;

  try {
    const exists = await kv.get(kvKey);
    if (exists) {
      return {
        success: false,
        error: '此交易已被使用，每个交易只能使用一次',
      };
    }
  } catch (error: any) {
    console.error('KV 查询失败:', error);
    return {
      success: false,
      error: 'Payment verification service error',
    };
  }

  // 2. 创建 RPC 客户端
  const chainConfig = CHAIN_CONFIG[network as SupportedNetwork];
  if (!chainConfig) {
    return {
      success: false,
      error: `不支持的网络: ${network}`,
    };
  }

  const rpcUrl = process.env[chainConfig.rpcKey];
  if (!rpcUrl) {
    console.error(`❌ 缺少 RPC URL: ${chainConfig.rpcKey}`);
    return {
      success: false,
      error: 'RPC configuration missing',
    };
  }

  const client = createPublicClient({
    chain: chainConfig.chain,
    transport: http(rpcUrl),
  });

  // 3. 获取交易 receipt
  let receipt;
  try {
    receipt = await client.getTransactionReceipt({ hash: txHash });
  } catch (error: any) {
    // 交易不存在或未确认
    return {
      success: false,
      error: '交易未确认，请稍后重试',
    };
  }

  // 4. 检查交易状态
  if (receipt.status !== 'success') {
    return {
      success: false,
      error: '交易执行失败',
    };
  }

  // 5. 解析 USDC Transfer event
  // Transfer(address indexed from, address indexed to, uint256 value)
  // Event signature hash (keccak256)
  const TRANSFER_EVENT_SIGNATURE =
    '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

  let transferLog = null;

  for (const log of receipt.logs) {
    // 检查是否是 USDC 合约的事件
    if (log.address.toLowerCase() !== usdcAddress.toLowerCase()) {
      continue;
    }

    // 检查是否是 Transfer event (topics[0] 是事件签名)
    if (log.topics[0]?.toLowerCase() !== TRANSFER_EVENT_SIGNATURE.toLowerCase()) {
      continue;
    }

    // Transfer event 有 3 个 topics: [signature, from, to]
    if (log.topics.length === 3 && log.topics[2]) {
      const to = `0x${log.topics[2].slice(26)}`.toLowerCase(); // 去掉前面的 padding

      if (to === receiveAddress) {
        transferLog = log;
        break;
      }
    }
  }

  if (!transferLog) {
    return {
      success: false,
      error: '未找到有效的 USDC 转账记录',
    };
  }

  // 6. 解析转账金额
  const amountHex = transferLog.data;
  const amountBigInt = BigInt(amountHex);
  const amountUSDC = Number(amountBigInt) / 1_000_000; // USDC 6 位小数

  // 7. 验证金额
  const requiredUSDC = Number(requiredAmount) / 1_000_000;

  if (amountUSDC < requiredUSDC) {
    return {
      success: false,
      error: `支付金额不足：需要 ${requiredUSDC} USDC，实际 ${amountUSDC} USDC`,
    };
  }

  // 8. 记录到 KV（防止重用）
  try {
    await kv.set(
      kvKey,
      {
        timestamp: Date.now(),
        amount: amountUSDC,
        from: `0x${transferLog.topics[1]?.slice(26)}`,
        to: receiveAddress,
        endpoint: requirement.accepts[0].resource,
      },
      {
        ex: 30 * 24 * 3600, // 30 天过期
      }
    );
  } catch (error: any) {
    console.error('KV 写入失败:', error);
    // 写入失败也继续，因为验证已通过
  }

  // 9. 返回成功
  return {
    success: true,
    details: {
      txHash,
      from: `0x${transferLog.topics[1]?.slice(26)}`,
      to: receiveAddress,
      amount: amountHex,
      amountUSDC,
    },
  };
}

// ============================================
// 价格配置辅助函数
// ============================================

/**
 * 获取所有支持的支付网络
 */
export function getSupportedNetworks(): (keyof typeof USDC_ADDRESSES)[] {
  return Object.keys(USDC_ADDRESSES) as (keyof typeof USDC_ADDRESSES)[];
}

/**
 * 获取网络的 USDC 地址
 */
export function getUSDCAddress(network: keyof typeof USDC_ADDRESSES): string {
  return USDC_ADDRESSES[network];
}

/**
 * 获取服务价格（USDC，6 位小数）
 */
export function getPrice(service: keyof typeof PRICING): string {
  return PRICING[service];
}

/**
 * 格式化价格为人类可读格式
 */
export function formatPrice(priceKey: keyof typeof PRICING): string {
  const rawPrice = PRICING[priceKey];
  const decimal = Number(rawPrice) / 1_000_000; // USDC 6 位小数
  return `${decimal} USDC`;
}
