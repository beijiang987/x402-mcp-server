# ERC-8004 快速开始指南

5 分钟快速上手 ERC-8004 AI Agent 身份和声誉管理！

## 第一步：获取测试 ETH

在 Sepolia 测试网上进行测试（免费）：

1. 访问 [Sepolia Faucet](https://sepoliafaucet.com/)
2. 输入您的钱包地址
3. 获取免费测试 ETH

## 第二步：配置环境

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，添加以下配置：
X402_WALLET_PRIVATE_KEY="your_private_key_here"
ERC8004_NETWORK="sepolia"
X402_RPC_URL="https://sepolia.infura.io/v3/YOUR_KEY"
```

⚠️ **安全提示：** 请使用专门的测试钱包，不要使用存有大量资金的主钱包！

## 第三步：安装依赖

```bash
npm install
npm run build
```

## 第四步：注册你的第一个 Agent

### 方式 A: 使用 Claude Desktop (MCP)

在 Claude Desktop 中：

```
请使用 erc8004_register_agent 工具帮我注册一个 AI Agent：
- 名称：My Trading Bot
- 描述：自动化 DeFi 交易助手
- 能力：trading, market-analysis, risk-management
- 标签：defi, trading
```

### 方式 B: 使用示例代码

```bash
# 编辑 examples/erc8004-example.ts，然后运行：
npm run example:erc8004
```

### 方式 C: 使用 HTTP API

```bash
curl -X POST https://your-domain.vercel.app/api/erc8004?action=register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Trading Bot",
    "metadata": {
      "description": "自动化 DeFi 交易助手",
      "capabilities": ["trading", "market-analysis"],
      "tags": ["defi", "trading"]
    }
  }'
```

## 第五步：搜索和发现 Agents

### 在 Claude Desktop 中：

```
请帮我搜索所有与 "trading" 相关的 AI Agents，
要求评分至少 4.0 星
```

### 使用 HTTP API：

```bash
curl "https://your-domain.vercel.app/api/erc8004?action=search&keyword=trading&minRating=4.0"
```

## 第六步：提交反馈

### 在 Claude Desktop 中：

```
请为 Agent ID 42 提交 5 星评价，
评论：优秀的交易机器人，策略稳定可靠！
```

### 使用 HTTP API：

```bash
curl -X POST https://your-domain.vercel.app/api/erc8004?action=submit-feedback \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "42",
    "rating": 5,
    "comment": "优秀的交易机器人，策略稳定可靠！"
  }'
```

## 常用操作

### 查看 Agent 详情

```bash
curl "https://your-domain.vercel.app/api/erc8004?action=agent&id=42"
```

### 获取热门 Agents

```bash
curl "https://your-domain.vercel.app/api/erc8004?action=trending&limit=10"
```

### 查看平台统计

```bash
curl "https://your-domain.vercel.app/api/erc8004?action=stats"
```

## 在区块链浏览器中查看

注册成功后，您可以在区块链浏览器中查看交易：

**Sepolia 测试网：**
```
https://sepolia.etherscan.io/tx/YOUR_TX_HASH
```

**合约地址：**
- IdentityRegistry: `0x8004A818BFB912233c491871b3d84c89A494BD9e`
- ReputationRegistry: `0x8004B663056A597Dffe9eCcC1965A193B7388713`

## 集成 x402 支付

### 为高级查询添加支付

```typescript
import { X402PaymentService } from './src/payment-service.js';

// 创建支付请求
const paymentRequest = await paymentService.createPaymentRequest({
  resourcePath: '/api/erc8004/advanced-search',
  amount: '0.0001',
  currency: 'ETH',
  description: '高级 Agent 搜索和分析',
  networks: ['base', 'ethereum']
});

// 返回 402 响应给用户
// 用户支付后可访问高级功能
```

### 设置收费端点

在 `api/erc8004.ts` 中：

```typescript
// 免费：基础搜索（≤20 个结果）
// 付费：高级搜索（>20 个结果）
if (requestedCount > 20) {
  // 需要 x402 支付
  return res.status(402).json({
    paymentRequired: {
      amount: '0.0001',
      currency: 'ETH',
      description: `获取 ${requestedCount} 个 Agents`
    }
  });
}
```

## 变现建议

### 基础层（免费）
- ✅ 注册 Agent
- ✅ 基础搜索（≤20 结果）
- ✅ 查看 Agent 详情
- ✅ 获取反馈（≤10 条）

### 高级层（付费）
- 💰 高级搜索（>20 结果）- 0.0001 ETH
- 💰 批量查询 - 0.0005 ETH
- 💰 历史数据导出 - 0.001 ETH
- 💰 详细分析报告 - 0.005 ETH

### 订阅层（月付）
- 💎 无限 API 访问 - 0.01 ETH/月
- 💎 高级筛选和排序 - 0.01 ETH/月
- 💎 实时通知 - 0.005 ETH/月

## 下一步

1. **部署到生产环境**
   - 参考 [部署指南](./README.md#部署)
   - 配置主网合约地址

2. **集成 The Graph**
   - 创建自定义 Subgraph
   - 优化查询性能

3. **添加前端 UI**
   - Agent 搜索页面
   - 评分和反馈界面
   - 分析仪表板

4. **开启事件监听**
   - 实时追踪新注册
   - 自动更新声誉分数
   - 发送通知

## 常见问题

**Q: 注册 Agent 需要多少 Gas 费？**
A: 在 Sepolia 测试网约 0.001 ETH，主网约 0.01-0.05 ETH（取决于 gas 价格）

**Q: 可以修改已注册的 Agent 信息吗？**
A: 可以，使用 `updateAgentMetadata` 方法

**Q: 反馈可以删除或修改吗？**
A: 不可以，链上反馈是不可变的，这保证了声誉系统的可信度

**Q: 如何防止恶意刷评分？**
A: 每个地址只能对同一个 Agent 提交一次反馈，且需要支付 gas 费

**Q: The Graph 索引需要多久？**
A: 通常 1-5 分钟，取决于网络状况

## 获取帮助

- 📖 [完整集成指南](./ERC8004_INTEGRATION_GUIDE.md)
- 💬 [GitHub Issues](https://github.com/your-repo/issues)
- 🌐 [ERC-8004 官网](https://8004.org)
- 📚 [x402 文档](https://docs.x402.org)

---

祝您使用愉快！🚀
