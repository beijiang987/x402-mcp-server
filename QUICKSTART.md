# 🚀 快速入门指南

从零开始，5 分钟内运行你的第一个 AI Agent 数据查询。

---

## 📋 前置要求

- Node.js 18+
- npm 或 yarn
- （可选）以太坊钱包用于实际支付

---

## 第一步：安装项目

```bash
# 克隆仓库
git clone https://github.com/your-repo/x402-mcp-server
cd x402-mcp-server

# 安装依赖
npm install

# 构建项目
npm run build
```

---

## 第二步：配置环境

```bash
# 复制环境变量模板
cp .env.example .env
```

编辑 `.env` 文件：

```env
# RPC URLs（可使用公共 RPC）
X402_ETH_RPC_URL=https://eth.llamarpc.com
X402_BASE_RPC_URL=https://mainnet.base.org
X402_POLYGON_RPC_URL=https://polygon-rpc.com

# 支付地址（暂时可以不填，免费层不需要）
X402_BASE_ADDRESS=
X402_ETH_ADDRESS=
```

---

## 第三步：启动服务器

```bash
npm start
```

你应该看到：

```
x402 MCP server running on stdio
```

---

## 第四步：测试 API（免费）

### 方法 1：使用 Claude Desktop

编辑 Claude Desktop 配置（macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`）：

```json
{
  "mcpServers": {
    "x402-data": {
      "command": "node",
      "args": [
        "/absolute/path/to/x402-mcp-server/dist/index.js"
      ]
    }
  }
}
```

重启 Claude Desktop，然后问：

```
查询 WETH 在以太坊上的当前价格
```

### 方法 2：使用示例代码

运行 Python 示例：

```bash
python3 examples/simple-agent-example.py
```

输出：

```
🤖 AI Trading Agent 启动

==================================================
📊 开始分析 WETH
==================================================

🔍 查询 WETH 跨链价格...

💰 价格分析:
  ethereum   $3,000.50  (流动性: $50,000,000)
  base       $3,005.20  (流动性: $10,000,000)
  polygon    $2,998.80  (流动性: $8,000,000)

🎯 套利机会:
  在 polygon 买入，在 base 卖出
  潜在利润: 0.21%

🔒 扫描合约...
  安全评分: 85/100
  合约验证: ✅
  蜜罐检测: ❌ 安全

💡 交易建议:
  ➡️  中性 - 持有或观望
  信心度: 60%
  理由: 无明显套利机会，但代币基本面良好

💳 数据服务费用: $0.0210

==================================================
✅ 分析完成
==================================================
```

---

## 第五步：编写你的第一个 Agent

创建 `my-agent.ts`：

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function main() {
  // 创建客户端
  const client = new Client({
    name: 'my-first-agent',
    version: '1.0.0'
  }, {
    capabilities: {}
  });

  // 连接到 MCP 服务器
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['./dist/index.js']
  });

  await client.connect(transport);
  console.log('✅ 已连接到 x402 数据服务\n');

  // 查询 USDC 跨链价格
  console.log('📊 查询 USDC 跨链价格...\n');

  const result = await client.callTool({
    name: 'get_multichain_price',
    arguments: {
      token_symbol: 'USDC',
      chains: ['ethereum', 'base', 'polygon']
    }
  });

  const data = JSON.parse(result.content[0].text);

  // 展示结果
  console.log('代币:', data.token);
  console.log('\n价格对比:');

  for (const [chain, info] of Object.entries(data.prices)) {
    console.log(`  ${chain}: $${info.price} (${info.bestDex})`);
  }

  // 检查套利机会
  if (data.arbitrageOpportunity) {
    const arb = data.arbitrageOpportunity;
    console.log('\n🎯 套利机会:');
    console.log(`  ${arb.buyChain} → ${arb.sellChain}`);
    console.log(`  利润: ${arb.potentialProfit.toFixed(2)}%`);
  }

  await client.close();
}

main().catch(console.error);
```

运行：

```bash
npx tsx my-agent.ts
```

---

## 🎓 下一步学习

### 学习路径

1. **基础** ✅
   - [x] 安装和配置
   - [x] 运行第一个查询
   - [x] 理解数据结构

2. **进阶** 📚
   - [ ] 阅读 [API 文档](./API.md)
   - [ ] 查看 [完整示例](./examples/)
   - [ ] 了解 [定价模型](./PRICING.md)

3. **实战** 🚀
   - [ ] 构建套利检测 Bot
   - [ ] 创建投资分析工具
   - [ ] 开发安全扫描服务

### 推荐示例

- **[套利交易 Agent](./examples/trading-agent-example.ts)** - 完整的自动化套利 Bot
- **[简单分析工具](./examples/simple-agent-example.py)** - Python 实现的代币分析
- **[使用场景](./examples/usage-example.md)** - 更多实际应用

---

## 💡 常见任务

### 查询代币价格

```typescript
const price = await client.callTool({
  name: 'get_token_price',
  arguments: {
    token_address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    chain: 'ethereum'
  }
});
```

### 检测套利机会

```typescript
const arb = await client.callTool({
  name: 'get_multichain_price',
  arguments: {
    token_symbol: 'USDC'
  }
});

if (arb.arbitrageOpportunity) {
  console.log('发现套利机会！');
}
```

### 安全检查

```typescript
const safety = await client.callTool({
  name: 'scan_contract_safety',
  arguments: {
    contract_address: '0x...'
  }
});

if (safety.riskScore < 30) {
  console.log('✅ 安全通过');
}
```

### 分析流动性池

```typescript
const pool = await client.callTool({
  name: 'get_pool_analytics',
  arguments: {
    pool_address: '0x...',
    chain: 'ethereum'
  }
});

console.log(`APY: ${pool.apy}%`);
console.log(`TVL: $${pool.tvl}`);
```

---

## 🆓 免费使用限制

免费层每天可调用 **10 次**，足够测试和开发。

想要更多？

- **Starter** ($10/月): 10,000 次/月
- **Pro** ($50/月): 100,000 次/月
- **Enterprise**: 无限制

---

## ❓ 遇到问题？

### 常见问题

**Q: 为什么连接失败？**
A: 确保已运行 `npm run build` 并且服务器正在运行。

**Q: 如何查看调用次数？**
A: 免费层自动计数，可以通过 `list_payment_configs` 查看。

**Q: 支持哪些代币？**
A: USDC, WETH, USDT, DAI 等主流代币。更多代币即将支持。

**Q: 数据实时性如何？**
A: 价格数据延迟 < 1 秒。

### 获取帮助

- 📖 查看 [完整文档](./API.md)
- 💬 加入 [Discord 社区](https://discord.gg/x402)
- 🐛 提交 [GitHub Issue](https://github.com/your-repo/issues)
- 📧 邮件 support@x402-data.com

---

## 🎉 成功！

恭喜！你已经成功运行了第一个 AI Agent 数据查询。

现在你可以：

1. ✅ 构建自己的交易 Bot
2. ✅ 创建数据分析工具
3. ✅ 开发 AI Agent 应用

**开始构建下一代 AI 经济！** 🚀

---

_需要更多帮助？查看 [API 文档](./API.md) 或 [示例代码](./examples/)_
