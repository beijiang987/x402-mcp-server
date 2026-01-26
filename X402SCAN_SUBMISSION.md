# x402scan 提交指南

## 📋 提交信息

### 服务 URL
```
https://x402-mcp-server.vercel.app
```

### 提交页面
```
https://www.x402scan.com/resources/register
```

---

## ✅ 验证清单

在提交前，已验证以下内容：

### 1. 服务发现文档 ✅
- **URL**: https://x402-mcp-server.vercel.app/.well-known/x402.json
- **状态**: 200 OK
- **Schema**: x402 V2 (最新版本)

### 2. API 端点 ✅
所有端点均返回正确的 402 响应：

| 端点 | 测试 URL |
|------|---------|
| Token Price | https://x402-mcp-server.vercel.app/api/x402/tokens/price?token_address=0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2&chain=ethereum |
| Multichain Price | https://x402-mcp-server.vercel.app/api/x402/tokens/prices/multichain?token_symbol=USDC |
| Pool Analytics | https://x402-mcp-server.vercel.app/api/x402/pools/analytics?pool_address=0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640&chain=ethereum |
| Whale Transactions | https://x402-mcp-server.vercel.app/api/x402/transactions/whales?token_address=0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2&chain=ethereum |
| Contract Safety | https://x402-mcp-server.vercel.app/api/x402/contracts/safety?contract_address=0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2&chain=ethereum |

### 3. x402 V2 Schema 合规性 ✅

**响应包含所有必需字段：**
```json
{
  "x402Version": 2,
  "error": "Payment required",
  "accepts": [
    {
      "scheme": "exact",
      "network": "eip155:8453",  // CAIP-2 格式 ✅
      "amount": "300",
      "asset": "eip155:8453/erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      "payTo": "0xa893994dbe2ea7dd7e48410638d6a1b1b663b6a3",
      "maxTimeoutSeconds": 300,
      "extra": {}
    }
  ],
  "resource": {
    "url": "https://x402-mcp-server.vercel.app/api/x402/tokens/price",
    "description": "Real-time token price from DEX",
    "mimeType": "application/json"
  },
  "extensions": {
    "bazaar": {  // x402scan 所需的扩展 ✅
      "discoverable": true,
      "category": "defi",
      "tags": ["price", "token", "dex", "analytics"],
      "info": {
        "input": {...},
        "output": {...}
      }
    }
  }
}
```

### 4. Bazaar Extension ✅

每个端点都包含完整的 bazaar 扩展：
- ✅ `discoverable: true`
- ✅ `category`: 明确的分类（defi）
- ✅ `tags`: 相关标签
- ✅ `info.input`: 请求参数 schema
- ✅ `info.output`: 响应数据 schema

---

## 🚀 提交步骤

### 方法 1: 网页提交（推荐）

1. **访问注册页面**
   ```
   https://www.x402scan.com/resources/register
   ```

2. **输入服务 URL**
   ```
   https://x402-mcp-server.vercel.app
   ```

3. **选择 Schema 版本**
   - 选择 **V2 Schema (Recommended)** ✅
   - 不要选择 V1 (已弃用)

4. **提交验证**
   - x402scan 会自动：
     - 抓取 `.well-known/x402.json`
     - 验证所有端点的 402 响应
     - 检查 bazaar extension
     - 验证 CAIP-2 网络格式

5. **等待索引**
   - 如果验证通过，服务会自动添加到资源列表
   - 通常在几分钟内完成

### 方法 2: GitHub Issue（备选）

如果网页提交遇到问题：

1. **访问 GitHub**
   ```
   https://github.com/Merit-Systems/x402scan/issues
   ```

2. **创建新 Issue**
   - 标题：`[Resource Submission] x402 AI Agent Data Service`
   - 内容：
     ```markdown
     ## Service URL
     https://x402-mcp-server.vercel.app

     ## Discovery Document
     https://x402-mcp-server.vercel.app/.well-known/x402.json

     ## Description
     Real-time blockchain data APIs for AI agents - Token prices, pool analytics,
     whale tracking, and contract security. Supports 6 blockchain networks
     (Ethereum, Base, BNB Chain, Polygon, Arbitrum, Optimism).

     ## Category
     DeFi / Data Services

     ## Endpoints
     - GET /api/x402/tokens/price
     - GET /api/x402/tokens/prices/multichain
     - GET /api/x402/pools/analytics
     - GET /api/x402/transactions/whales
     - GET /api/x402/contracts/safety

     ## Compliance
     - ✅ x402 V2 Schema
     - ✅ Bazaar Extension
     - ✅ CAIP-2 Network Format
     - ✅ All endpoints return 402
     ```

---

## 📊 服务信息

### 基本信息
- **服务名称**: x402 AI Agent Data Service
- **类型**: MCP Server / HTTP API
- **分类**: DeFi, Data Services, Analytics
- **网络支持**: 6 条主流链
  - Ethereum
  - Base
  - BNB Chain (BSC)
  - Polygon
  - Arbitrum
  - Optimism

### 端点列表
1. **Token Price** - 实时代币价格 ($0.0003/次)
2. **Multichain Price** - 跨链价格聚合 ($0.001/次)
3. **Pool Analytics** - 流动池分析 ($0.002/次)
4. **Whale Transactions** - 巨鲸交易监控 ($0.005/次)
5. **Contract Safety** - 合约安全扫描 ($0.02/次)

### 支付方式
- **Base 链**: USDC (0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913)
- **以太坊**: USDC (0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48)
- **接收地址**: 0xa893994dbe2ea7dd7e48410638d6a1b1b663b6a3

### 联系方式
- **网站**: https://x402-mcp-server.vercel.app
- **GitHub**: https://github.com/beijiang987/x402-mcp-server
- **Email**: support@x402-data.com

---

## ✅ 验证后的状态

提交后，可在以下位置验证：

1. **x402scan 搜索**
   ```
   https://www.x402scan.com
   ```
   搜索：`x402 AI Agent Data Service` 或 `x402-mcp-server`

2. **资源列表**
   ```
   https://www.x402scan.com/resources
   ```
   查找我们的服务

3. **服务详情页**
   应显示：
   - 5 个 API 端点
   - 支持的 6 条区块链
   - 定价信息
   - 示例请求/响应
   - 交互式 API 测试

---

## 🔍 故障排除

### 如果提交失败

**可能原因：**
1. `.well-known/x402.json` 无法访问
2. API 端点未返回正确的 402 响应
3. Schema 验证失败
4. Bazaar extension 缺失或格式错误

**检查命令：**
```bash
# 测试发现文档
curl -I https://x402-mcp-server.vercel.app/.well-known/x402.json

# 测试 API 端点
curl -I "https://x402-mcp-server.vercel.app/api/x402/tokens/price?token_address=0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2&chain=ethereum"

# 查看完整响应
curl -s "https://x402-mcp-server.vercel.app/api/x402/tokens/price?token_address=0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2&chain=ethereum"
```

**当前状态：全部通过 ✅**

---

## 📝 提交日志

- **准备日期**: 2026-01-27
- **服务状态**: ✅ 在线
- **Schema 版本**: V2
- **验证状态**: ✅ 全部通过
- **准备提交**: ✅ 是

---

## 🎯 下一步

1. ✅ 验证部署（已完成）
2. ⏳ 提交到 x402scan（进行中）
3. ⏳ 等待索引完成
4. ⏳ 在 x402scan 上验证可见性
5. 📢 推广服务

---

**准备就绪！现在可以提交了。**
