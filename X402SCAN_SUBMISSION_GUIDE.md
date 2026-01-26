# x402scan 端点提交指南

## 📋 待提交端点

所有端点已部署并包含完整的 x402 v2 schema，支持自动发现。

### 1️⃣ Multichain Price (跨链价格聚合)
- **URL**: `https://x402-mcp-server.vercel.app/api/x402/multichain-price`
- **价格**: $0.001 per call
- **支付网络**: Base (eip155:8453)
- **支付金额**: 1,000 USDC (smallest unit)
- **分类**: DeFi
- **标签**: price, multichain, aggregation, dex
- **功能**: 比较同一代币在多条链上的价格，获取平均价格

**测试命令**:
```bash
curl "https://x402-mcp-server.vercel.app/api/x402/multichain-price?token_symbol=WETH"
```

---

### 2️⃣ Pool Analytics (流动池分析)
- **URL**: `https://x402-mcp-server.vercel.app/api/x402/pool-analytics`
- **价格**: $0.002 per call
- **支付网络**: Base (eip155:8453)
- **支付金额**: 2,000 USDC (smallest unit)
- **分类**: DeFi
- **标签**: liquidity, pool, analytics, tvl, apy
- **功能**: 获取流动池的 TVL、24h 交易量、APY 等关键指标

**测试命令**:
```bash
curl "https://x402-mcp-server.vercel.app/api/x402/pool-analytics?pool_address=0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640&chain=ethereum"
```

---

### 3️⃣ Whale Transactions (巨鲸交易监控)
- **URL**: `https://x402-mcp-server.vercel.app/api/x402/whale-transactions`
- **价格**: $0.005 per call
- **支付网络**: Base (eip155:8453)
- **支付金额**: 5,000 USDC (smallest unit)
- **分类**: Analytics
- **标签**: whale, transactions, monitoring, large-transfers
- **功能**: 监控大额代币转账，追踪聪明钱动向

**测试命令**:
```bash
curl "https://x402-mcp-server.vercel.app/api/x402/whale-transactions?token_address=0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2&chain=ethereum&min_value_usd=100000"
```

---

### 4️⃣ Contract Safety (合约安全扫描)
- **URL**: `https://x402-mcp-server.vercel.app/api/x402/contract-safety`
- **价格**: $0.02 per call
- **支付网络**: Base (eip155:8453)
- **支付金额**: 20,000 USDC (smallest unit)
- **分类**: Security
- **标签**: security, audit, honeypot, contract-analysis
- **功能**: 扫描智能合约安全性，检测蜜罐、风险评分、漏洞分析

**测试命令**:
```bash
curl "https://x402-mcp-server.vercel.app/api/x402/contract-safety?contract_address=0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2&chain=ethereum"
```

---

## 🔍 自动发现支持

所有端点已在发现文档中列出：
- **发现文档 URL**: `https://x402-mcp-server.vercel.app/.well-known/x402.json`
- **协议版本**: x402 v2.0
- **服务名称**: x402 AI Agent Data Service

根据 x402 协议规范，x402scan 应该能够自动扫描发现文档并索引所有端点。

**验证发现文档**:
```bash
curl https://x402-mcp-server.vercel.app/.well-known/x402.json
```

---

## 📝 手动提交步骤

如果需要手动注册每个端点：

### 方式 1: 通过 x402scan 网页注册
1. 访问 [x402scan 注册页面](https://www.x402scan.com/resources/register)
2. 输入完整的端点 URL
3. x402scan 会自动验证端点并提取 schema 信息
4. 确认提交

### 方式 2: 触发重新扫描（如果支持）
1. 在 x402scan 上找到已注册的服务 (x402 AI Agent Data Service)
2. 查找"重新扫描"或"更新端点"选项
3. 触发扫描 `.well-known/x402.json` 文件

---

## ✅ 验证清单

**所有端点已满足 x402scan 要求**:

- [x] x402Version: 2 (v2 协议)
- [x] accepts 数组包含完整支付信息
- [x] resource 对象包含 URL、描述、MIME 类型
- [x] extensions.bazaar.discoverable: true
- [x] extensions.bazaar.schema 包含 input/output JSON Schema
- [x] extensions.bazaar.info 包含示例请求和响应
- [x] 正确的 CAIP-2 网络格式 (eip155:8453)
- [x] 正确的 CAIP-19 资产格式 (eip155:8453/erc20:0x833...)

**部署状态**:
- [x] 所有端点在 Vercel 上部署
- [x] 所有端点返回正确的 HTTP 402 响应
- [x] 所有端点包含完整的 bazaar extension
- [x] 发现文档已更新并可访问

---

## 🎯 提交顺序建议

按价格从低到高提交（可选）：

1. Multichain Price - $0.001
2. Pool Analytics - $0.002
3. Whale Transactions - $0.005
4. Contract Safety - $0.02

---

## 📞 需要帮助？

如果遇到问题：
- 检查端点是否正常返回 402 响应
- 验证 bazaar extension 是否完整
- 确认 x402scan 支持的提交方式
- 联系 x402scan 支持团队

---

## 🔗 相关链接

- **项目主页**: https://x402-mcp-server.vercel.app
- **GitHub**: https://github.com/beijiang987/x402-mcp-server
- **x402scan**: https://www.x402scan.com
- **x402 协议**: https://www.x402.org

---

**生成时间**: 2026-01-26
**服务版本**: x402 v2.0
**支付地址**: 0xa893994dbe2ea7dd7e48410638d6a1b1b663b6a3
