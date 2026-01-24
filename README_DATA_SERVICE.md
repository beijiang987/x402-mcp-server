# x402 AI Agent 数据服务

> 为 AI Agents 提供实时链上数据，通过 x402 协议实现按需微支付 🤖💰

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![x402 Protocol](https://img.shields.io/badge/x402-Protocol-blue)](https://x402.org)

---

## 🎯 项目定位

**x402 AI Agent 数据服务** 是首个专为 AI Agents 设计的按需付费数据平台。通过 x402 微支付协议，AI Agents 可以自主调用链上数据，无需账户、订阅或复杂集成。

### 为什么选择我们？

| 传统 API 服务 | x402 数据服务 |
|-------------|------------|
| 💳 月费 $99起 | 💰 $0.0003/次起 |
| 📝 需要注册账户 | 🚀 无需账户 |
| 🔒 信用卡订阅 | ⚡ 加密货币即时支付 |
| 📊 固定套餐 | 🎯 按需使用 |
| 🤖 难以 AI 集成 | ✅ 原生 AI Agent 支持 |

---

## ⚡ 快速开始

### 安装

```bash
git clone https://github.com/your-repo/x402-mcp-server
cd x402-mcp-server
npm install
npm run build
```

### 配置

```bash
cp .env.example .env
# 编辑 .env 文件，配置 RPC URLs 和钱包地址
```

### 运行

```bash
npm start
```

### 使用示例

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

const client = new Client(/* ... */);

// 获取 ETH 价格
const price = await client.callTool({
  name: 'get_token_price',
  arguments: {
    token_address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    chain: 'ethereum'
  }
});

// 跨链套利检测
const arbitrage = await client.callTool({
  name: 'get_multichain_price',
  arguments: {
    token_symbol: 'USDC',
    chains: ['ethereum', 'base', 'polygon']
  }
});

// 合约安全扫描
const safety = await client.callTool({
  name: 'scan_contract_safety',
  arguments: {
    contract_address: '0x...',
    chain: 'ethereum'
  }
});
```

---

## 🛠️ 核心功能

### 数据服务工具

#### 1. 代币价格查询 (`get_token_price`)
- ✅ 实时 DEX 价格
- ✅ 流动性和交易量
- ✅ 5+ 主流链支持
- 💰 $0.0003/次

#### 2. 跨链价格聚合 (`get_multichain_price`)
- ✅ 多链价格对比
- ✅ 自动识别套利机会
- ✅ 最优 DEX 推荐
- 💰 $0.001/次

#### 3. 流动池分析 (`get_pool_analytics`)
- ✅ TVL 和交易量
- ✅ APY 计算
- ✅ 无常损失估算
- 💰 $0.002/次

#### 4. 巨鲸监控 (`get_whale_transactions`)
- ✅ 实时大额交易
- ✅ 可定制监控阈值
- ✅ 交易类型分类
- 💰 $0.005/次

#### 5. 合约安全扫描 (`scan_contract_safety`)
- ✅ 风险评分（0-100）
- ✅ 蜜罐检测
- ✅ 代理合约识别
- 💰 $0.02/次

### 支付工具

- `verify_payment` - 验证 x402 支付
- `create_payment_request` - 创建支付请求
- `check_payment_status` - 查询支付状态
- `list_payment_configs` - 列出付费配置

---

## 💰 定价

### 订阅层级

| 层级 | 月费 | 包含调用 | 超出费用 |
|------|------|----------|----------|
| **Free** | $0 | 10/天 | 需升级 |
| **Starter** | $10 | 10,000 | $0.0015/次 |
| **Pro** | $50 | 100,000 | $0.0008/次 |
| **Enterprise** | 定制 | 无限制 | 包含 |

### 按使用付费

| 工具 | 价格 | Starter 折扣 | Pro 折扣 |
|------|------|------------|---------|
| `get_token_price` | $0.0003 | 0% | 20% |
| `get_multichain_price` | $0.001 | 0% | 20% |
| `get_pool_analytics` | $0.002 | 10% | 30% |
| `get_whale_transactions` | $0.005 | 10% | 30% |
| `scan_contract_safety` | $0.02 | 0% | 25% |

📄 [完整定价说明](./PRICING.md)

---

## 📚 文档

- **[API 文档](./API.md)** - 完整的 API 参考
- **[定价说明](./PRICING.md)** - 详细的定价和计费
- **[使用示例](./examples/)** - 代码示例和最佳实践

---

## 🚀 使用案例

### 套利交易 Bot

```typescript
// 自动检测跨链套利机会
const arb = await client.callTool({
  name: 'get_multichain_price',
  arguments: { token_symbol: 'USDC' }
});

if (arb.arbitrageOpportunity.potentialProfit > 0.5) {
  // 执行套利交易
  console.log(`发现套利: ${arb.buyChain} → ${arb.sellChain}`);
  console.log(`潜在利润: ${arb.potentialProfit}%`);
}
```

### DeFi 投资助手

```typescript
// 分析流动性池收益
const pool = await client.callTool({
  name: 'get_pool_analytics',
  arguments: { pool_address: '0x...', chain: 'ethereum' }
});

if (pool.apy > 20 && pool.tvl > 1000000) {
  console.log(`高收益池: APY ${pool.apy}%, TVL $${pool.tvl}`);
}
```

### 安全风控系统

```typescript
// 扫描代币安全性
const safety = await client.callTool({
  name: 'scan_contract_safety',
  arguments: { contract_address: '0x...', chain: 'ethereum' }
});

if (safety.riskScore > 50 || safety.hasHoneypot) {
  console.log('⚠️ 高风险代币，不推荐交易');
}
```

---

## 🏗️ 项目结构

```
x402-mcp-server/
├── src/
│   ├── index.ts              # MCP 服务器入口
│   ├── data-service.ts       # 数据服务核心
│   ├── payment-service.ts    # 支付服务
│   └── pricing-config.ts     # 定价配置
├── examples/
│   ├── trading-agent-example.ts    # TypeScript 示例
│   ├── simple-agent-example.py     # Python 示例
│   └── usage-example.md            # 使用文档
├── API.md                    # API 文档
├── PRICING.md                # 定价文档
└── README.md                 # 本文件
```

---

## 🔧 技术栈

- **协议**: Model Context Protocol (MCP)
- **支付**: x402 微支付协议
- **语言**: TypeScript
- **区块链**: EVM 兼容链
- **数据源**: Uniswap V3, DEX Aggregators

---

## 🌐 支持的网络

- ✅ Ethereum 主网
- ✅ Base L2
- ✅ Polygon PoS
- ✅ Arbitrum One
- ✅ Optimism

---

## 📈 路线图

### Q1 2024 ✅
- [x] 核心数据服务 API
- [x] x402 支付集成
- [x] 5 个数据工具

### Q2 2024
- [ ] Solana 支持
- [ ] WebSocket 实时流
- [ ] 历史数据查询
- [ ] 更多 DEX 集成（Curve, Balancer）

### Q3 2024
- [ ] AI 预测模型
- [ ] 高级风控工具
- [ ] 自定义数据流
- [ ] Enterprise SLA

### Q4 2024
- [ ] 去中心化数据网络
- [ ] DAO 治理
- [ ] 数据市场

---

## 🤝 贡献

欢迎贡献代码！请查看 [CONTRIBUTING.md](./CONTRIBUTING.md)。

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

---

## 📄 许可证

MIT License - 详见 [LICENSE](./LICENSE)

---

## 🔗 相关资源

- [x402 Protocol](https://x402.org) - x402 协议官网
- [x402 Docs](https://docs.x402.org) - 协议文档
- [MCP Specification](https://modelcontextprotocol.io) - MCP 协议规范
- [Uniswap V3](https://uniswap.org) - DEX 数据源

---

## 📞 联系我们

- **Discord**: https://discord.gg/x402data
- **Twitter**: [@x402data](https://twitter.com/x402data)
- **Email**: support@x402-data.com
- **GitHub**: [Issues](https://github.com/your-repo/x402-mcp-server/issues)

---

## ⭐ Star History

如果这个项目对你有帮助，请给我们一个 Star！

---

**由 x402 协议驱动，让 AI Agents 真正自主！** 🤖⚡💰
