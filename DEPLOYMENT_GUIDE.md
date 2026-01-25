# x402 HTTP API 服务器部署指南

## 📋 部署前准备

### 1. 安装依赖

```bash
cd /Users/wangjiangbei/x402-mcp-server
npm install
```

### 2. 编译 TypeScript

```bash
npm run build
```

### 3. 配置环境变量

创建 `.env` 文件（基于 `.env.example`）：

```bash
cp .env.example .env
```

**必需配置：**
```env
# 支付接收地址（重要！）
X402_PAYMENT_ADDRESS_BASE=0xYourActualBaseAddress
X402_PAYMENT_ADDRESS_ETH=0xYourActualEthAddress

# 服务 URL（部署后更新）
SERVICE_URL=https://your-project.vercel.app
```

**可选配置：**
```env
# Etherscan API（推荐 - 免费申请）
ETHERSCAN_API_KEY=your_etherscan_key

# 其他 API keys 暂时可以留空
```

---

## 🚀 部署到 Vercel

### 方法 1: 使用 Vercel CLI（推荐）

#### Step 1: 安装 Vercel CLI

```bash
npm install -g vercel
```

#### Step 2: 登录 Vercel

```bash
vercel login
```

系统会打开浏览器，使用 GitHub 账号登录。

#### Step 3: 初始化项目

```bash
cd /Users/wangjiangbei/x402-mcp-server
vercel
```

按照提示：
- **Set up and deploy?** → `Y`
- **Which scope?** → 选择您的账户
- **Link to existing project?** → `N`
- **Project name?** → `x402-mcp-server`（或自定义）
- **Directory?** → `.`（当前目录）
- **Override settings?** → `N`

#### Step 4: 设置环境变量

```bash
# 设置支付地址（Base）
vercel env add X402_PAYMENT_ADDRESS_BASE
# 输入您的 Base 地址: 0x...

# 设置支付地址（Ethereum）
vercel env add X402_PAYMENT_ADDRESS_ETH
# 输入您的以太坊地址: 0x...

# 设置 Etherscan API Key（可选）
vercel env add ETHERSCAN_API_KEY
# 输入您的 API key

# 设置服务 URL（稍后更新）
vercel env add SERVICE_URL
# 输入: https://x402-mcp-server.vercel.app（根据实际域名）
```

选择环境：
- **Production** → `Yes`
- **Preview** → `Yes`
- **Development** → `No`（开发用本地）

#### Step 5: 部署到生产环境

```bash
vercel --prod
```

等待部署完成（通常 1-2 分钟）。

#### Step 6: 获取部署 URL

部署成功后，Vercel 会输出：
```
✅  Production: https://x402-mcp-server.vercel.app [复制的链接]
```

**保存这个 URL！** 稍后需要提交到 x402scan。

---

### 方法 2: 通过 GitHub 集成（自动部署）

#### Step 1: 推送代码到 GitHub

```bash
cd /Users/wangjiangbei/x402-mcp-server

# 检查当前状态
git status

# 添加新文件
git add .

# 提交
git commit -m "Add HTTP API server for x402scan integration"

# 推送
git push origin main
```

#### Step 2: 连接 Vercel

1. 访问 [vercel.com](https://vercel.com)
2. 点击 **New Project**
3. 导入 `beijiang987/x402-mcp-server` 仓库
4. 配置项目：
   - **Framework Preset**: Other
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

#### Step 3: 添加环境变量

在 Vercel 项目设置中：
1. 进入 **Settings** → **Environment Variables**
2. 添加以下变量：
   ```
   X402_PAYMENT_ADDRESS_BASE = 0xYour...
   X402_PAYMENT_ADDRESS_ETH = 0xYour...
   ETHERSCAN_API_KEY = (可选)
   SERVICE_URL = https://your-project.vercel.app
   ```

#### Step 4: 部署

点击 **Deploy** 按钮，等待部署完成。

---

## ✅ 验证部署

### 1. 检查健康状态

```bash
curl https://your-project.vercel.app/health
```

预期响应：
```json
{
  "status": "ok",
  "timestamp": 1704067200000,
  "service": "x402-mcp-server",
  "version": "1.0.0"
}
```

### 2. 检查 x402 发现文档

```bash
curl https://your-project.vercel.app/.well-known/x402.json
```

应该返回完整的 x402 schema。

### 3. 测试 HTTP 402 响应

```bash
curl -i https://your-project.vercel.app/api/token-price?token_address=0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2&chain=ethereum
```

预期响应：
```
HTTP/2 402 Payment Required
Content-Type: application/json

{
  "error": {
    "code": "payment_required",
    "message": "Payment of 0.0003 USD required...",
    ...
  },
  "payment": {
    "networks": [...]
  }
}
```

### 4. 测试带支付证明的请求

```bash
curl -H "X-Payment-Proof: test-proof-123" \
     -H "X-Payment-Network: eip155:8453" \
     https://your-project.vercel.app/api/token-price?token_address=0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2&chain=ethereum
```

预期响应：
```json
{
  "success": true,
  "data": {
    "address": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    "symbol": "WETH",
    "price": 3000.50,
    ...
  },
  "meta": {
    "payment_verified": true
  }
}
```

---

## 📤 提交到 x402scan

### Step 1: 访问注册页面

打开浏览器访问：
```
https://www.x402scan.com/resources/register
```

### Step 2: 提交 URL

在表单中输入您的 Vercel 部署 URL：
```
https://your-project.vercel.app/
```

### Step 3: 等待验证

x402scan 会自动：
1. 检测 `.well-known/x402.json` 发现文档
2. 验证 API 端点返回 HTTP 402
3. 提取服务信息和定价
4. 将服务添加到生态系统列表

### Step 4: 验证索引成功

访问 x402scan 主页并搜索：
- "x402 AI Agent Data Service"
- "beijiang987"
- 您的 Vercel 域名

如果找到您的服务，说明上架成功！🎉

---

## 🔧 本地测试（可选）

在部署前，您可以在本地测试：

```bash
# 1. 编译 TypeScript
npm run build

# 2. 启动 HTTP 服务器
npm run start:http

# 3. 在另一个终端测试
curl http://localhost:3000/health
curl http://localhost:3000/api/token-price?token_address=0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2
```

---

## 📊 监控和管理

### Vercel Dashboard

访问 [vercel.com/dashboard](https://vercel.com/dashboard) 查看：
- 部署历史
- 日志和错误
- 流量分析
- 函数执行时间

### 查看日志

```bash
vercel logs
```

### 重新部署

```bash
# 本地更改后
git add .
git commit -m "Update API"
git push

# 或者手动触发
vercel --prod
```

---

## 🐛 常见问题

### 1. "Module not found" 错误

**解决：** 确保运行了 `npm install` 和 `npm run build`

### 2. 环境变量未生效

**解决：** 在 Vercel Dashboard 中检查环境变量，确保选择了 "Production" 环境

### 3. API 返回 500 错误

**解决：**
- 查看 Vercel 日志：`vercel logs`
- 检查 TypeScript 编译错误
- 确保所有依赖已安装

### 4. x402scan 无法索引

**解决：**
- 确保 `.well-known/x402.json` 可访问
- 确保至少一个 API 端点返回 HTTP 402
- 等待 1-2 分钟让 x402scan 重新抓取

---

## 📚 下一步

- ✅ **Phase 1 完成**: HTTP API 已上线
- 🔄 **Phase 2**: 集成真实数据源（CoinGecko, GoPlus）
- 🔒 **Phase 3**: 实现完整的链上支付验证

查看完整计划：[/Users/wangjiangbei/.claude/plans/greedy-orbiting-snail.md](file:///Users/wangjiangbei/.claude/plans/greedy-orbiting-snail.md)

---

## 🆘 获取帮助

- **Vercel 文档**: https://vercel.com/docs
- **x402 文档**: https://x402.gitbook.io/x402
- **GitHub Issues**: https://github.com/beijiang987/x402-mcp-server/issues

祝您部署顺利！🚀
