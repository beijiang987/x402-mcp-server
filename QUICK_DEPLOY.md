# 🚀 快速部署到 Vercel（无需命令行）

## 5 分钟完成部署！

由于系统中未安装 Node.js，我们使用 **Vercel 网页界面** 部署，更简单！

---

## 步骤 1: 访问 Vercel

1. 打开浏览器访问：**https://vercel.com**
2. 点击右上角 **Sign Up** 或 **Log In**
3. 选择 **Continue with GitHub**
4. 授权 Vercel 访问您的 GitHub 账号

---

## 步骤 2: 导入 GitHub 项目

1. 登录后，点击 **Add New...** → **Project**
2. 在 "Import Git Repository" 页面：
   - 找到 **`beijiang987/x402-mcp-server`** 仓库
   - 如果没看到，点击 **Adjust GitHub App Permissions** 授权访问
   - 点击仓库旁边的 **Import** 按钮

---

## 步骤 3: 配置项目

在 "Configure Project" 页面：

### 3.1 基本设置
- **Project Name**: `x402-mcp-server`（或您喜欢的名称）
- **Framework Preset**: `Other`（保持默认）
- **Root Directory**: `./`（保持默认）

### 3.2 构建设置（点击 "Build and Output Settings" 展开）
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### 3.3 环境变量（⚠️ 重要！）

点击 **Environment Variables** 展开，添加以下变量：

#### 必需变量：

| 名称 | 值 | 说明 |
|------|---|------|
| `X402_PAYMENT_ADDRESS_BASE` | `0x你的Base地址` | Base 链支付接收地址 |
| `X402_PAYMENT_ADDRESS_ETH` | `0x你的以太坊地址` | 以太坊支付接收地址 |
| `NODE_ENV` | `production` | 生产环境标识 |

**如何添加：**
1. 在 "Key" 输入框输入变量名（例如 `X402_PAYMENT_ADDRESS_BASE`）
2. 在 "Value" 输入框输入对应的值
3. 勾选 **Production**、**Preview**、**Development** 三个环境
4. 点击 **Add** 按钮
5. 重复以上步骤添加其他变量

#### 可选变量（暂时可以不添加）：
- `ETHERSCAN_API_KEY` - Etherscan API key（Phase 3 需要）
- `SERVICE_URL` - 部署完成后再更新

---

## 步骤 4: 部署

1. 确认所有设置正确
2. 点击底部的 **Deploy** 按钮
3. 等待 2-3 分钟（Vercel 会自动构建和部署）

您会看到：
- 📦 Installing dependencies...
- 🔨 Building...
- ✅ Deployment successful!

---

## 步骤 5: 获取部署 URL

部署成功后：

1. 您会看到 🎉 **Congratulations!** 页面
2. 复制显示的 URL，格式类似：
   ```
   https://x402-mcp-server.vercel.app
   ```
   或
   ```
   https://x402-mcp-server-your-username.vercel.app
   ```

3. **保存这个 URL！** 稍后需要提交到 x402scan

---

## 步骤 6: 验证部署

在浏览器中访问以下 URL（替换为您的实际域名）：

### 6.1 健康检查
```
https://your-project.vercel.app/health
```
应该看到：
```json
{
  "status": "ok",
  "timestamp": 1704067200000,
  "service": "x402-mcp-server",
  "version": "1.0.0"
}
```

### 6.2 x402 发现文档
```
https://your-project.vercel.app/.well-known/x402.json
```
应该看到完整的 JSON 配置

### 6.3 测试 API 端点
```
https://your-project.vercel.app/api/token-price?token_address=0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2
```

**在浏览器开发者工具中查看响应**（按 F12）：
- Status: `402 Payment Required`
- Response 包含 `payment` 信息

✅ 如果看到以上响应，说明部署成功！

---

## 步骤 7: 更新 SERVICE_URL 环境变量

1. 在 Vercel Dashboard 中，进入您的项目
2. 点击顶部的 **Settings** 标签
3. 左侧菜单选择 **Environment Variables**
4. 点击 **Add New** 按钮
5. 添加：
   - Key: `SERVICE_URL`
   - Value: `https://your-actual-domain.vercel.app`
   - 勾选所有环境
6. 点击 **Save**
7. 返回 **Deployments** 标签
8. 点击最新部署右侧的 **...** → **Redeploy**

---

## 步骤 8: 提交到 x402scan 🎯

1. 访问：**https://www.x402scan.com/resources/register**

2. 在表单中输入您的 Vercel URL：
   ```
   https://your-project.vercel.app/
   ```

3. 点击 **提交** 或 **Register**

4. 等待 x402scan 验证（通常 1-2 分钟）

5. 验证成功后，访问 x402scan 主页搜索：
   - "x402 AI Agent Data Service"
   - "beijiang987"

6. 如果找到您的服务，说明 **上架成功！🎉**

---

## 🎊 恭喜！您已完成部署

您的 x402 HTTP API 服务器现已上线：

✅ 在 Vercel 上运行（免费）
✅ 支持 HTTP 402 支付协议
✅ 可被 x402scan 索引
✅ 提供 5 个 AI Agent 数据服务端点

---

## 📊 监控和管理

### Vercel Dashboard
访问 https://vercel.com/dashboard 查看：
- 📈 实时流量和请求
- 📝 函数执行日志
- ⚙️ 环境变量管理
- 🔄 部署历史

### 查看日志
1. 进入项目页面
2. 点击 **Deployments** 标签
3. 点击最新的部署
4. 点击 **Functions** 标签查看实时日志

### 自动部署
以后每次您推送代码到 GitHub main 分支，Vercel 会自动重新部署！

```bash
git add .
git commit -m "Update API"
git push
# Vercel 自动部署 ✨
```

---

## ❓ 常见问题

### 1. 部署失败怎么办？

**查看错误日志：**
1. 在部署页面点击 **View Build Logs**
2. 查看红色的错误信息

**常见原因：**
- 环境变量未设置
- TypeScript 编译错误
- 依赖安装失败

**解决方法：**
- 确保添加了 `X402_PAYMENT_ADDRESS_BASE` 和 `X402_PAYMENT_ADDRESS_ETH`
- 检查 GitHub 代码是否最新
- 点击 **Redeploy** 重试

### 2. API 返回 500 错误

**检查：**
- Vercel 函数日志（Functions 标签）
- 环境变量是否正确

**常见原因：**
- 缺少环境变量
- 代码编译问题

### 3. x402scan 无法索引

**确保：**
- `.well-known/x402.json` 可访问（在浏览器中打开）
- 至少一个 `/api/*` 端点返回 402
- URL 格式正确（包含 https://）
- 等待 2-5 分钟让 x402scan 抓取

### 4. 我没有钱包地址怎么办？

**临时解决方案：**
使用测试地址：
```
X402_PAYMENT_ADDRESS_BASE=0x0000000000000000000000000000000000000000
X402_PAYMENT_ADDRESS_ETH=0x0000000000000000000000000000000000000000
```

**正式使用：**
1. 安装 MetaMask 浏览器插件
2. 创建钱包
3. 复制钱包地址
4. 在 Vercel 环境变量中更新地址
5. Redeploy

---

## 🚀 下一步（可选）

### Phase 2: 集成真实数据源
- CoinGecko API（代币价格）
- GoPlus Security（合约安全）
- Uniswap Subgraph（流动池数据）

### Phase 3: 完整支付验证
- 真实的链上交易验证
- x402 签名验证
- 支付记录和速率限制

---

## 📞 需要帮助？

- **Vercel 文档**: https://vercel.com/docs
- **x402 文档**: https://x402.gitbook.io/x402
- **GitHub Issues**: https://github.com/beijiang987/x402-mcp-server/issues

祝您部署顺利！🎉
