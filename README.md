# x402 MCP Server

一个用于集成 [x402 支付协议](https://www.x402.org) 的 Model Context Protocol (MCP) 服务器。该工具允许 AI 助手（如 Claude）验证支付、创建支付请求，并与基于区块链的互联网原生支付系统进行交互。

---

## 🚀 快速部署 HTTP API 服务器

**新功能！** 现在支持 HTTP API 服务器，可被 x402scan 索引和发现。

### 一键部署到 Vercel（免费）

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/beijiang987/x402-mcp-server)

或按照详细指南部署：

📖 **[部署检查清单](./DEPLOY_CHECKLIST.md)** - 一步步部署指南（5分钟完成）

📖 **[快速部署指南](./QUICK_DEPLOY.md)** - 网页界面部署（无需命令行）

**部署后您将获得：**
- ✅ 免费的生产环境 API 服务器
- ✅ 5 个区块链数据 API 端点
- ✅ HTTP 402 支付协议支持
- ✅ 在 x402scan 上可被发现
- ✅ 自动 HTTPS 和全球 CDN

---

## 什么是 x402？

x402 是一个开放的互联网原生支付标准，基于 HTTP 402 状态码构建。它允许：

- 🚀 **即时支付** - 以互联网速度进行交易
- 🔐 **无账户访问** - 无需注册或个人信息
- ⛓️ **多链支持** - 支持以太坊、Base、Polygon 等
- 🤖 **AI 原生** - 专为机器对机器支付设计
- 💸 **零协议费** - 仅收取区块链网络费用

## 功能特性

该 MCP 服务器提供以下工具：

### 1. `verify_payment`
验证 x402 支付签名并检查支付是否有效。

**参数：**
- `payment_signature` (string, 必需): x402 支付签名
- `resource_path` (string, 必需): 正在访问的资源路径
- `expected_amount` (string, 可选): 预期支付金额

**返回：** 支付验证结果，包括交易哈希、支付者地址、金额和时间戳。

### 2. `create_payment_request`
创建带有 402 Payment Required 响应的 x402 支付请求。

**参数：**
- `resource_path` (string, 必需): 需要支付的资源路径
- `amount` (string, 必需): 所需支付金额
- `currency` (string, 可选): 货币或代币符号（默认：ETH）
- `description` (string, 必需): 付费资源描述
- `networks` (array, 可选): 支持的区块链网络（默认：['base', 'ethereum']）

**返回：** 包含支付详情和使用说明的 402 响应结构。

### 3. `check_payment_status`
检查 x402 支付交易的状态。

**参数：**
- `transaction_hash` (string, 必需): 区块链交易哈希
- `network` (string, 可选): 区块链网络（默认：base）

**返回：** 支付状态，包括确认状态、区块号和确认数。

### 4. `list_payment_configs`
列出所有已配置的支付端点及其要求。

**返回：** 所有支付配置的列表。

## 安装

### 前置要求

- Node.js 18+
- npm 或 yarn

### 步骤

1. 克隆或下载此项目：
```bash
cd x402-mcp-server
```

2. 安装依赖：
```bash
npm install
```

3. 配置环境变量：
```bash
cp .env.example .env
# 编辑 .env 文件，填入你的配置
```

4. 构建项目：
```bash
npm run build
```

## 配置

### 环境变量

在 `.env` 文件中配置以下变量：

```env
# 钱包私钥（用于签署交易）
X402_WALLET_PRIVATE_KEY=your_private_key_here

# RPC URLs
X402_RPC_URL=https://mainnet.base.org
X402_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY

# 支付接收地址
X402_BASE_ADDRESS=0xYourBaseAddressHere
X402_ETH_ADDRESS=0xYourEthereumAddressHere
```

### Claude Desktop 配置

在 Claude Desktop 中配置此 MCP 服务器，编辑配置文件：

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

添加以下配置：

```json
{
  "mcpServers": {
    "x402-payment": {
      "command": "node",
      "args": [
        "/absolute/path/to/x402-mcp-server/dist/index.js"
      ],
      "env": {
        "X402_WALLET_PRIVATE_KEY": "your_private_key",
        "X402_RPC_URL": "https://mainnet.base.org",
        "X402_BASE_ADDRESS": "0xYourAddress"
      }
    }
  }
}
```

## 使用示例

### 创建支付请求

```typescript
// 通过 MCP 调用
{
  "tool": "create_payment_request",
  "arguments": {
    "resource_path": "/api/premium-data",
    "amount": "0.001",
    "currency": "ETH",
    "description": "Premium API access",
    "networks": ["base", "ethereum"]
  }
}
```

### 验证支付

```typescript
// 通过 MCP 调用
{
  "tool": "verify_payment",
  "arguments": {
    "payment_signature": "0x...",
    "resource_path": "/api/premium-data",
    "expected_amount": "0.001"
  }
}
```

### 检查支付状态

```typescript
// 通过 MCP 调用
{
  "tool": "check_payment_status",
  "arguments": {
    "transaction_hash": "0x123abc...",
    "network": "base"
  }
}
```

## 开发

### 运行开发模式

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

### 运行服务器

```bash
npm start
```

## 工作原理

1. **支付请求流程**：
   - 服务器检测到需要支付的资源访问
   - 返回 HTTP 402 状态码和支付要求
   - 客户端收到支付详情（金额、网络、地址等）

2. **支付验证流程**：
   - 客户端创建并签署区块链交易
   - 将支付签名发送给服务器
   - 服务器验证链上交易
   - 验证通过后授予资源访问权限

3. **状态检查**：
   - 查询区块链确认交易状态
   - 返回确认数和区块信息

## 安全注意事项

- ⚠️ **永远不要** 将私钥提交到版本控制系统
- 🔐 使用环境变量存储敏感信息
- 🛡️ 在生产环境中使用专用的支付钱包
- 🔍 始终验证支付金额和接收地址
- 📊 记录所有支付交易以便审计

## 资源

- [x402 官网](https://www.x402.org)
- [x402 文档](https://docs.x402.org)
- [x402 GitHub](https://github.com/coinbase/x402)
- [MCP 协议规范](https://modelcontextprotocol.io)

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 支持

如遇到问题，请：
1. 查看 [x402 文档](https://docs.x402.org)
2. 在 GitHub 上提交 Issue
3. 加入 [Discord 社区](https://discord.com/invite/cdp)

---

由 Claude Code 生成 🤖
