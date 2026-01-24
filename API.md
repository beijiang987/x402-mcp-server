# x402 AI Agent 数据服务 API 文档

## 概述

x402 AI Agent 数据服务通过 Model Context Protocol (MCP) 提供实时链上数据、DeFi 分析和安全服务。所有服务通过 x402 协议支持微支付，适合 AI Agent 自主调用。

**Base URL**: `mcp://x402-data-service`
**协议**: Model Context Protocol (MCP)
**支付**: x402 微支付协议
**支持链**: Ethereum, Base, Polygon, Arbitrum, Optimism

---

## 认证

### x402 支付认证

每次 API 调用需要包含 x402 支付证明：

```typescript
{
  "headers": {
    "X-Payment-Signature": "<x402_payment_signature>",
    "X-Payment-Amount": "<amount_in_eth>",
    "X-Payment-Network": "<blockchain_network>"
  }
}
```

### 免费额度

- 免费层：每天 10 次调用
- 无需支付签名
- 适合测试和开发

---

## API 端点

### 1. 获取代币价格

获取单个代币在指定链上的实时价格。

**工具名称**: `get_token_price`

**参数**:
| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| `token_address` | string | ✅ | 代币合约地址 |
| `chain` | string | ❌ | 区块链网络（默认: ethereum） |

**支持的链**:
- `ethereum` - 以太坊主网
- `base` - Base L2
- `polygon` - Polygon PoS
- `arbitrum` - Arbitrum One
- `optimism` - Optimism

**响应**:
```json
{
  "address": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  "symbol": "WETH",
  "price": 3000.50,
  "priceUsd": 3000.50,
  "liquidity": 5000000,
  "volume24h": 1200000,
  "chain": "ethereum",
  "source": "Uniswap V3",
  "timestamp": 1704067200000
}
```

**定价**: $0.0003/调用

**示例**:
```typescript
const result = await mcpClient.callTool({
  name: 'get_token_price',
  arguments: {
    token_address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    chain: 'ethereum'
  }
});
```

---

### 2. 跨链价格聚合

获取代币在多条链上的价格并识别套利机会。

**工具名称**: `get_multichain_price`

**参数**:
| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| `token_symbol` | string | ✅ | 代币符号（如 USDC, WETH） |
| `chains` | string[] | ❌ | 要查询的链列表 |

**支持的代币**: USDC, WETH, USDT, DAI 等主流代币

**响应**:
```json
{
  "token": "USDC",
  "prices": {
    "ethereum": {
      "price": 1.0001,
      "liquidity": 50000000,
      "bestDex": "Uniswap V3"
    },
    "base": {
      "price": 1.0005,
      "liquidity": 10000000,
      "bestDex": "Uniswap V3"
    },
    "polygon": {
      "price": 0.9998,
      "liquidity": 8000000,
      "bestDex": "QuickSwap"
    }
  },
  "arbitrageOpportunity": {
    "buyChain": "polygon",
    "sellChain": "base",
    "potentialProfit": 0.07
  }
}
```

**定价**: $0.001/调用

**示例**:
```typescript
const result = await mcpClient.callTool({
  name: 'get_multichain_price',
  arguments: {
    token_symbol: 'USDC',
    chains: ['ethereum', 'base', 'polygon']
  }
});
```

---

### 3. 流动池分析

获取 DEX 流动池的详细分析数据。

**工具名称**: `get_pool_analytics`

**参数**:
| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| `pool_address` | string | ✅ | 流动池合约地址 |
| `chain` | string | ❌ | 区块链网络 |

**响应**:
```json
{
  "poolAddress": "0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640",
  "token0": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  "token1": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  "tvl": 150000000,
  "volume24h": 50000000,
  "volume7d": 350000000,
  "fee24h": 15000,
  "apy": 25.8,
  "impermanentLoss": 0.3,
  "chain": "ethereum",
  "dex": "Uniswap V3"
}
```

**字段说明**:
- `tvl`: 总锁仓价值（USD）
- `volume24h`: 24 小时交易量（USD）
- `apy`: 年化收益率（%）
- `impermanentLoss`: 无常损失（%）

**定价**: $0.002/调用

**示例**:
```typescript
const result = await mcpClient.callTool({
  name: 'get_pool_analytics',
  arguments: {
    pool_address: '0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640',
    chain: 'ethereum'
  }
});
```

---

### 4. 巨鲸交易监控

监控大额交易（巨鲸活动）。

**工具名称**: `get_whale_transactions`

**参数**:
| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| `token_address` | string | ✅ | 代币合约地址 |
| `chain` | string | ❌ | 区块链网络 |
| `min_amount_usd` | number | ❌ | 最小金额（USD，默认 100000） |
| `limit` | number | ❌ | 返回数量（默认 10） |

**响应**:
```json
[
  {
    "hash": "0x123abc...",
    "from": "0xabc123...",
    "to": "0xdef456...",
    "token": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    "amount": 500,
    "amountUsd": 1500000,
    "type": "sell",
    "timestamp": 1704067200000,
    "chain": "ethereum",
    "dex": "Uniswap V3"
  }
]
```

**定价**: $0.005/调用

**示例**:
```typescript
const result = await mcpClient.callTool({
  name: 'get_whale_transactions',
  arguments: {
    token_address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    chain: 'ethereum',
    min_amount_usd: 100000,
    limit: 10
  }
});
```

---

### 5. 合约安全扫描

扫描智能合约的安全风险。

**工具名称**: `scan_contract_safety`

**参数**:
| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| `contract_address` | string | ✅ | 合约地址 |
| `chain` | string | ❌ | 区块链网络 |

**响应**:
```json
{
  "address": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  "riskScore": 15,
  "isVerified": true,
  "hasProxies": false,
  "hasHoneypot": false,
  "ownershipRenounced": true,
  "risks": [],
  "warnings": [
    "High concentration in top 10 holders"
  ],
  "chain": "ethereum"
}
```

**风险评分**:
- `0-20`: 低风险 ✅
- `21-50`: 中等风险 ⚠️
- `51-100`: 高风险 ❌

**定价**: $0.02/调用

**示例**:
```typescript
const result = await mcpClient.callTool({
  name: 'scan_contract_safety',
  arguments: {
    contract_address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    chain: 'ethereum'
  }
});
```

---

## 错误处理

### 错误码

| 错误码 | 说明 |
|--------|------|
| `402` | Payment Required - 需要支付 |
| `400` | Bad Request - 参数错误 |
| `404` | Not Found - 资源未找到 |
| `429` | Too Many Requests - 超出限额 |
| `500` | Internal Server Error - 服务器错误 |

### 错误响应

```json
{
  "error": "Payment Required",
  "message": "Payment of 0.0003 USD required",
  "code": 402,
  "details": {
    "tool": "get_token_price",
    "priceUsd": 0.0003,
    "priceEth": 0.0000001,
    "paymentAddress": "0x..."
  }
}
```

---

## 速率限制

| 层级 | 限制 | 备注 |
|------|------|------|
| Free | 10/天 | 无需支付 |
| Starter | 100/分钟 | 需订阅 |
| Pro | 1000/分钟 | 需订阅 |
| Enterprise | 无限制 | 定制方案 |

---

## SDK 示例

### TypeScript / JavaScript

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const client = new Client({
  name: 'my-trading-agent',
  version: '1.0.0'
}, {
  capabilities: {}
});

// 连接到 MCP 服务器
const transport = new StdioClientTransport({
  command: 'node',
  args: ['x402-mcp-server/dist/index.js']
});

await client.connect(transport);

// 调用工具
const price = await client.callTool({
  name: 'get_token_price',
  arguments: {
    token_address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    chain: 'ethereum'
  }
});

console.log(JSON.parse(price.content[0].text));
```

### Python

```python
from mcp import Client

client = Client("x402-data-service")

# 获取价格
price = client.call_tool(
    "get_token_price",
    token_address="0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    chain="ethereum"
)

print(price)
```

---

## 最佳实践

### 1. 缓存策略

```typescript
// 缓存价格数据（10 秒）
const cache = new Map();
const CACHE_TTL = 10000;

async function getCachedPrice(tokenAddress: string, chain: string) {
  const key = `${chain}_${tokenAddress}`;
  const cached = cache.get(key);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const price = await client.callTool({
    name: 'get_token_price',
    arguments: { token_address: tokenAddress, chain }
  });

  cache.set(key, { data: price, timestamp: Date.now() });
  return price;
}
```

### 2. 批量查询

```typescript
// 并行查询多个代币
const tokens = ['0xabc...', '0xdef...', '0x123...'];

const prices = await Promise.all(
  tokens.map(token =>
    client.callTool({
      name: 'get_token_price',
      arguments: { token_address: token, chain: 'ethereum' }
    })
  )
);
```

### 3. 错误重试

```typescript
async function retryableCall(toolName: string, args: any, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await client.callTool({ name: toolName, arguments: args });
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(1000 * Math.pow(2, i)); // 指数退避
    }
  }
}
```

---

## 支持的代币地址

### USDC
- Ethereum: `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`
- Base: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- Polygon: `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174`

### WETH
- Ethereum: `0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2`
- Base: `0x4200000000000000000000000000000000000006`
- Polygon: `0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619`

### USDT
- Ethereum: `0xdAC17F958D2ee523a2206206994597C13D831ec7`
- Polygon: `0xc2132D05D31c914a87C6611C10748AEb04B58e8F`

---

## 常见问题

**Q: 如何获取实时价格更新？**
A: 使用轮询（推荐间隔 5-10 秒）或订阅 WebSocket 流（Enterprise 层）。

**Q: 数据延迟是多少？**
A: 价格数据 < 1 秒，池子数据 < 5 秒。

**Q: 支持历史数据吗？**
A: 目前仅提供实时数据，历史数据功能即将推出。

**Q: 如何处理跨链桥接？**
A: 我们提供价格数据，实际桥接需要使用 Across、Stargate 等跨链桥。

---

## 更新日志

### v1.0.0 (2024-01-15)
- ✅ 初始发布
- ✅ 支持 5 条主流链
- ✅ 提供 5 个核心数据工具
- ✅ x402 支付集成

---

## 联系我们

- **Discord**: https://discord.gg/x402
- **Twitter**: @x402data
- **Email**: support@x402-data.com
- **文档**: https://docs.x402-data.com

---

_使用 x402 协议构建，让 AI Agent 真正自主！_ 🤖💰
