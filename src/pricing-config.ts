/**
 * AI Agent 数据服务定价配置
 * 所有价格以 USD 计价，在支付时转换为 ETH/USDC
 */

export interface PricingTier {
  name: string;
  description: string;
  monthlyFee?: number; // 月费（USD）
  includedCalls?: number; // 包含的调用次数
  overageFee?: number; // 超出部分每次调用费用（USD）
}

export interface ToolPrice {
  tool: string;
  description: string;
  pricePerCall: number; // USD
  tier1Discount?: number; // Starter 层折扣（百分比）
  tier2Discount?: number; // Pro 层折扣（百分比）
  tier3Discount?: number; // Enterprise 层折扣（百分比）
}

/**
 * 订阅层级
 */
export const PRICING_TIERS: PricingTier[] = [
  {
    name: 'Free',
    description: '免费层，适合测试和开发',
    monthlyFee: 0,
    includedCalls: 10, // 每天 10 次
    overageFee: 0, // 免费层超出后需要升级
  },
  {
    name: 'Starter',
    description: '初创项目和小型 AI Agents',
    monthlyFee: 10,
    includedCalls: 10000,
    overageFee: 0.0015, // $0.0015/次
  },
  {
    name: 'Pro',
    description: '专业开发者和生产环境',
    monthlyFee: 50,
    includedCalls: 100000,
    overageFee: 0.0008, // $0.0008/次
  },
  {
    name: 'Enterprise',
    description: '大规模应用和定制需求',
    monthlyFee: 0, // 定制定价
    includedCalls: -1, // 无限制
    overageFee: 0,
  },
];

/**
 * 按使用付费（Pay-as-you-go）定价
 * 适合通过 x402 微支付的场景
 */
export const TOOL_PRICING: ToolPrice[] = [
  // ========== Tier 1：基础数据（薄利多销）==========
  {
    tool: 'get_token_price',
    description: '实时代币价格查询（单链）',
    pricePerCall: 0.0003, // $0.0003/次
    tier1Discount: 0,
    tier2Discount: 20,
    tier3Discount: 50,
  },
  {
    tool: 'get_multichain_price',
    description: '跨链价格聚合和套利机会识别',
    pricePerCall: 0.001, // $0.001/次
    tier1Discount: 0,
    tier2Discount: 20,
    tier3Discount: 50,
  },

  // ========== Tier 2：分析数据（中等利润）==========
  {
    tool: 'get_pool_analytics',
    description: '流动池分析（TVL、APY、交易量）',
    pricePerCall: 0.002, // $0.002/次
    tier1Discount: 10,
    tier2Discount: 30,
    tier3Discount: 60,
  },
  {
    tool: 'get_whale_transactions',
    description: '巨鲸交易监控和警报',
    pricePerCall: 0.005, // $0.005/次（实时监控成本较高）
    tier1Discount: 10,
    tier2Discount: 30,
    tier3Discount: 60,
  },

  // ========== Tier 3：高级服务（高利润）==========
  {
    tool: 'scan_contract_safety',
    description: '智能合约安全扫描和风险评估',
    pricePerCall: 0.02, // $0.02/次
    tier1Discount: 0,
    tier2Discount: 25,
    tier3Discount: 70,
  },
];

/**
 * 计算工具调用费用
 */
export function calculateToolPrice(
  toolName: string,
  tier: string = 'Free'
): number {
  const toolPrice = TOOL_PRICING.find((t) => t.tool === toolName);
  if (!toolPrice) {
    throw new Error(`Unknown tool: ${toolName}`);
  }

  let price = toolPrice.pricePerCall;

  // 应用层级折扣
  if (tier === 'Starter' && toolPrice.tier1Discount) {
    price *= 1 - toolPrice.tier1Discount / 100;
  } else if (tier === 'Pro' && toolPrice.tier2Discount) {
    price *= 1 - toolPrice.tier2Discount / 100;
  } else if (tier === 'Enterprise' && toolPrice.tier3Discount) {
    price *= 1 - toolPrice.tier3Discount / 100;
  }

  return price;
}

/**
 * 获取所有定价信息
 */
export function getPricingInfo() {
  return {
    tiers: PRICING_TIERS,
    tools: TOOL_PRICING,
    currency: 'USD',
    paymentMethods: ['ETH', 'USDC', 'USDT'],
    supportedChains: ['ethereum', 'base', 'polygon', 'arbitrum', 'optimism'],
    notes: [
      '价格以 USD 计价，支付时按实时汇率转换',
      '免费层每天限制 10 次调用',
      'Starter 和 Pro 层按月计费，包含一定调用次数',
      'Enterprise 层提供定制方案和专属支持',
      '所有层级均支持通过 x402 协议进行微支付',
    ],
  };
}

/**
 * ETH/USD 价格转换（示例，实际应从 oracle 获取）
 */
export async function convertUsdToEth(usdAmount: number): Promise<number> {
  // 这里应该调用价格 oracle（Chainlink、Uniswap TWAP 等）
  // 临时使用固定汇率
  const ethPriceUsd = 3000; // $3000/ETH
  return usdAmount / ethPriceUsd;
}

/**
 * 生成 x402 支付请求
 */
export function generatePaymentRequest(
  toolName: string,
  tier: string = 'Free'
): {
  tool: string;
  priceUsd: number;
  priceEth: number;
  description: string;
} {
  const priceUsd = calculateToolPrice(toolName, tier);
  const toolInfo = TOOL_PRICING.find((t) => t.tool === toolName);

  return {
    tool: toolName,
    priceUsd,
    priceEth: priceUsd / 3000, // 临时汇率
    description: toolInfo?.description || '',
  };
}

/**
 * 定价展示（Markdown 格式）
 */
export function generatePricingTable(): string {
  let markdown = '# AI Agent 数据服务定价\n\n';

  markdown += '## 订阅层级\n\n';
  markdown += '| 层级 | 月费 | 包含调用 | 超出费用 | 适用场景 |\n';
  markdown += '|------|------|----------|----------|----------|\n';

  PRICING_TIERS.forEach((tier) => {
    const monthlyFee =
      tier.monthlyFee === 0 && tier.name !== 'Free' ? '定制' : `$${tier.monthlyFee}`;
    const calls = tier.includedCalls === -1 ? '无限制' : tier.includedCalls?.toLocaleString();
    const overage =
      tier.overageFee === 0 && tier.name === 'Free'
        ? '需升级'
        : tier.overageFee
        ? `$${tier.overageFee}`
        : '包含';

    markdown += `| ${tier.name} | ${monthlyFee} | ${calls} | ${overage} | ${tier.description} |\n`;
  });

  markdown += '\n## 按使用付费（Pay-as-you-go）\n\n';
  markdown += '| 工具 | 描述 | 基础价格 | Starter 折扣 | Pro 折扣 | Enterprise 折扣 |\n';
  markdown += '|------|------|----------|--------------|----------|------------------|\n';

  TOOL_PRICING.forEach((tool) => {
    markdown += `| \`${tool.tool}\` | ${tool.description} | $${tool.pricePerCall} | ${tool.tier1Discount || 0}% | ${tool.tier2Discount || 0}% | ${tool.tier3Discount || 0}% |\n`;
  });

  markdown += '\n## 支付方式\n\n';
  markdown += '- 💰 支持代币：ETH, USDC, USDT\n';
  markdown += '- ⛓️ 支持网络：Ethereum, Base, Polygon, Arbitrum, Optimism\n';
  markdown += '- 🔄 实时汇率转换\n';
  markdown += '- ⚡ 通过 x402 协议即时结算\n\n';

  markdown += '## 说明\n\n';
  markdown += '- 所有价格以 USD 计价\n';
  markdown += '- 免费层每天限制 10 次调用，适合测试\n';
  markdown += '- 订阅用户享受折扣价格\n';
  markdown += '- Enterprise 层提供 SLA 保证和优先支持\n';

  return markdown;
}
