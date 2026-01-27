# API 密钥配置指南

## 📋 概述

为了让你的 x402 服务返回真实的链上数据，需要配置以下 API 密钥。所有密钥都是**免费**的！

## 🔑 第一步：获取 API 密钥

### 1. Etherscan API Key（必需）⭐

**用途**: 验证 Ethereum 链上的支付交易

**申请流程**:
1. 访问: https://etherscan.io/register
2. 填写邮箱和密码，创建账户
3. 验证邮箱（检查收件箱）
4. 登录后访问: https://etherscan.io/myapikey
5. 点击 **"+ Add"** 按钮
6. App Name 填写: `x402-mcp-server`
7. 点击 **"Create New API Key"**
8. 复制生成的 API Key（格式: `ABCDEFG123456...`）

**免费额度**: 5次/秒，完全够用

---

### 2. Basescan API Key（强烈推荐）⭐

**用途**: 验证 Base 链上的支付交易（你的主要收款链）

**申请流程**:
1. 访问: https://basescan.org/register
2. 与 Etherscan 流程相同
3. 登录后访问: https://basescan.org/myapikey
4. 创建 API Key: `x402-mcp-server-base`
5. 复制 API Key

**免费额度**: 5次/秒

---

### 3. Polygonscan API Key（可选）

**用途**: 支持 Polygon 链数据查询

**申请流程**:
1. 访问: https://polygonscan.com/register
2. 同样流程
3. API Key 页面: https://polygonscan.com/myapikey

---

### 4. Arbiscan API Key（可选）

**用途**: 支持 Arbitrum 链数据查询

**申请流程**:
1. 访问: https://arbiscan.io/register
2. API Key 页面: https://arbiscan.io/myapikey

---

## ⚙️ 第二步：配置 Vercel 环境变量

### 方法 1：通过 Vercel Dashboard（推荐）

1. **打开项目设置**
   ```
   访问: https://vercel.com/dashboard
   选择项目: x402-mcp-server
   点击: Settings → Environment Variables
   ```

2. **添加必需的变量**（至少这两个）

   **Etherscan API Key**:
   ```
   Name: ETHERSCAN_API_KEY
   Value: <粘贴你的 Etherscan API Key>
   Environment: Production ✓ Preview ✓ Development ✓ (全选)
   ```
   点击 **Save**

   **Basescan API Key**:
   ```
   Name: BASESCAN_API_KEY
   Value: <粘贴你的 Basescan API Key>
   Environment: Production ✓ Preview ✓ Development ✓ (全选)
   ```
   点击 **Save**

3. **可选变量**（如果你申请了其他链）

   **Polygonscan**:
   ```
   Name: POLYGONSCAN_API_KEY
   Value: <你的 Polygonscan API Key>
   ```

   **Arbiscan**:
   ```
   Name: ARBISCAN_API_KEY
   Value: <你的 Arbiscan API Key>
   ```

4. **触发重新部署**
   - 配置完成后，Vercel 会提示重新部署
   - 点击 **Redeploy** 按钮
   - 或者在代码中做一个小改动并 push（会自动部署）

### 方法 2：通过 Vercel CLI

```bash
# 安装 Vercel CLI（如果还没有）
npm i -g vercel

# 登录
vercel login

# 添加环境变量
vercel env add ETHERSCAN_API_KEY
# 粘贴 API Key，选择 Production + Preview + Development

vercel env add BASESCAN_API_KEY
# 粘贴 API Key，选择 Production + Preview + Development

# 重新部署
vercel --prod
```

---

## ✅ 第三步：验证配置

### 测试 1：检查环境变量

访问你的管理端点（需要等待部署完成约 30 秒）:
```bash
curl https://x402-mcp-server.vercel.app/api/admin/health
```

应该看到类似输出：
```json
{
  "status": "healthy",
  "env": {
    "ETHERSCAN_API_KEY": "✓ configured",
    "BASESCAN_API_KEY": "✓ configured",
    ...
  }
}
```

### 测试 2：验证真实数据

尝试调用 API（会触发免费额度限制）:
```bash
# 获取 WETH 价格（免费调用）
curl "https://x402-mcp-server.vercel.app/api/x402/tokens/price?token_address=0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2&chain=ethereum"
```

如果配置成功，你应该看到：
- 如果还有免费额度：返回真实的 WETH 价格数据
- 如果超过免费额度：返回 402 Payment Required（这是正常的！）

### 测试 3：查看部署日志

在 Vercel Dashboard:
1. 进入 **Deployments** 标签
2. 点击最新的部署
3. 查看 **Build Logs** 和 **Runtime Logs**
4. 应该看到：
   ```
   ✓ ETHERSCAN_API_KEY (optional)
   ✓ BASESCAN_API_KEY (optional)
   ```

---

## 🎯 配置检查清单

配置完成后，确认以下内容：

- [ ] Etherscan API Key 已添加到 Vercel 环境变量
- [ ] Basescan API Key 已添加到 Vercel 环境变量
- [ ] 环境变量应用到所有环境（Production + Preview + Development）
- [ ] 项目已重新部署
- [ ] 部署日志显示 API Key 已配置
- [ ] API 调用返回真实数据或 402 响应（不是 500 错误）

---

## 🔧 故障排除

### 问题 1: API 返回 500 错误

**可能原因**: API Key 未正确配置或格式错误

**解决方案**:
1. 检查 Vercel 环境变量拼写是否正确
2. 确认 API Key 没有多余的空格
3. 重新部署项目
4. 查看 Runtime Logs 中的错误信息

### 问题 2: 仍然返回 "需要 API Key" 错误

**可能原因**: 部署未生效

**解决方案**:
1. 确认已经重新部署
2. 清除浏览器缓存
3. 等待 1-2 分钟让部署完全生效
4. 尝试访问新的 URL（加个查询参数强制刷新）

### 问题 3: API Key 额度用完

**症状**: 返回 "rate limit exceeded" 错误

**解决方案**:
1. Etherscan/Basescan 免费额度是 5次/秒
2. 如果需要更高额度，可以升级到付费计划
3. 或者实现更激进的缓存策略（已有 Redis 缓存）

---

## 📚 参考链接

- Etherscan API 文档: https://docs.etherscan.io/
- Basescan API 文档: https://docs.basescan.org/
- Vercel 环境变量: https://vercel.com/docs/projects/environment-variables
- x402 协议文档: https://docs.x402.com/

---

## 💡 下一步

配置完成后，你可以：

1. ✅ **做测试支付** - 验证整个支付流程
2. ✅ **提交到 x402scan** - 让你的服务被索引
3. ✅ **监控使用情况** - 通过管理仪表板查看统计

需要帮助？查看项目的其他文档：
- [支付测试指南](PAYMENT_TEST_GUIDE.md)（待创建）
- [数据库设置](DATABASE_SETUP.md)
- [部署指南](README.md)
