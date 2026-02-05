# 🚀 快速开始测试（5分钟）

## 第一步：测试 RPC 连接（无需私钥）✅ 已配置

```bash
# 运行快速连接测试
npx tsx test/test-rpc-connection.ts
```

这个测试会验证：
- ✅ RPC 端点可用
- ✅ 能查询区块高度
- ✅ ERC-8004 合约已部署
- ✅ Gas price 正常

**预期输出**：
```
🔍 测试 RPC 连接...
📡 RPC URL: https://rpc.sepolia.org

1️⃣ 测试区块高度查询...
   ✅ 当前区块: 7234567

2️⃣ 测试合约代码查询...
   ✅ IdentityRegistry 合约已部署
   📦 Bytecode 长度: 12345 字节

3️⃣ 测试 Gas Price 查询...
   ✅ 当前 Gas Price: 1000000000 wei
   💰 约 1 Gwei

🎉 RPC 连接测试通过！
```

---

## 第二步：配置测试钱包

### 选项 A：生成新测试钱包（推荐）

```bash
# 生成新的测试钱包私钥
node -e "console.log('0x' + require('crypto').randomBytes(32).toString('hex'))"

# 复制输出的私钥（0x开头的64位十六进制）
```

### 选项 B：使用现有测试钱包

如果你已有测试钱包，直接使用其私钥。

### 更新 .env 文件

```bash
# 编辑 .env 文件
nano .env

# 或使用 VS Code
code .env
```

替换这一行：
```bash
X402_WALLET_PRIVATE_KEY="YOUR_PRIVATE_KEY_HERE"
```

为：
```bash
X402_WALLET_PRIVATE_KEY="0x你的私钥..."
```

⚠️ **安全提醒**：
- 只使用专用的测试钱包
- 不要用存有真实资金的钱包
- .env 文件已在 .gitignore 中，不会提交到 Git

---

## 第三步：获取测试 ETH

访问任一水龙头网站：

1. **Sepolia Faucet** (推荐): https://sepoliafaucet.com/
2. **QuickNode Faucet**: https://faucet.quicknode.com/ethereum/sepolia
3. **Alchemy Faucet**: https://sepoliafaucet.com/

步骤：
1. 输入你的钱包地址
2. 完成验证（通常是 reCAPTCHA）
3. 等待 1-2 分钟收到测试 ETH

需要的最小金额：
- 最少: 0.01 ETH（用于 gas）
- 推荐: 0.05 ETH（多次测试）

检查余额：
```bash
# 使用区块链浏览器
https://sepolia.etherscan.io/address/你的地址
```

---

## 第四步：运行完整冒烟测试

```bash
# 运行 Sepolia 冒烟测试
npm run test:smoke
```

这个测试会：
1. ✅ 检查钱包余额（需 >0.01 ETH）
2. ✅ 验证 IdentityRegistry 合约
3. ✅ 验证 ReputationRegistry 合约
4. ✅ 生成符合 EIP-8004 的注册文件
5. ⚠️ 模拟注册流程（不实际发送交易，除非你想测试）

**预期输出**：
```
🧪 ERC-8004 Sepolia 冒烟测试

📡 网络: Sepolia
🔗 RPC: https://rpc.sepolia.org
💼 钱包: 0x1234...5678

1️⃣ 检查钱包余额...
   ✅ 余额: 0.05 ETH

2️⃣ 验证 IdentityRegistry 合约...
   ✅ 合约地址: 0x8004A818BFB912233c491871b3d84c89A494BD9e
   ✅ Bytecode 已部署

3️⃣ 验证 ReputationRegistry 合约...
   ✅ 合约地址: 0x8004B663056A597Dffe9eCcC1965A193B7388713
   ✅ Bytecode 已部署

4️⃣ 生成注册文件...
   ✅ 符合 EIP-8004 规范

✅ 所有检查通过！
```

---

## 常见问题

### Q: RPC 连接测试失败

**错误**: `RPC 连接失败: fetch failed`

**解决**:
1. 检查网络连接
2. 尝试其他公共 RPC:
   ```bash
   # 编辑 .env
   X402_RPC_URL="https://ethereum-sepolia-rpc.publicnode.com"
   ```
3. 或申请 Infura API key:
   ```bash
   X402_RPC_URL="https://sepolia.infura.io/v3/YOUR_KEY"
   ```

### Q: 私钥格式错误

**错误**: `Invalid private key`

**检查**:
- 私钥必须以 `0x` 开头
- 后面是 64 位十六进制字符（0-9, a-f）
- 总长度 66 字符（0x + 64）

**正确格式**:
```
0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
```

### Q: 余额不足

**错误**: `Insufficient funds`

**解决**:
1. 访问水龙头获取测试 ETH
2. 等待 1-2 分钟
3. 使用区块链浏览器确认收到

### Q: 公共 RPC 太慢

**解决**: 申请免费的 RPC API key

1. **Infura** (推荐):
   - 注册: https://infura.io/
   - 创建项目
   - 复制 Sepolia 端点 URL

2. **Alchemy**:
   - 注册: https://www.alchemy.com/
   - 创建 app (Ethereum Sepolia)
   - 复制 HTTPS URL

---

## 测试成功后

### 下一步开发任务

1. **运行 The Graph 查询测试**
   ```bash
   npx tsx test/test-graph-query.ts
   ```

2. **测试完整注册流程**（实际发送交易）
   ```bash
   npx tsx examples/erc8004-example.ts
   ```

3. **部署到 Vercel**
   - 参考 [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)

### 继续集成

- [ ] 实现 x402 支付验证
- [ ] 添加 FeedbackAuth 签名
- [ ] 增强评分逻辑（int128 + tags）
- [ ] 注册服务本身为 ERC-8004 agent

---

## 快速参考

### 关键文件

- `.env` - 环境变量配置
- `test/test-rpc-connection.ts` - RPC 连接测试
- `test/smoke-test-sepolia.ts` - 完整冒烟测试
- `src/erc8004/contracts-v2.ts` - 合约配置
- `src/erc8004/graph-client-v2.ts` - The Graph 客户端

### 有用的命令

```bash
# 测试 RPC 连接
npx tsx test/test-rpc-connection.ts

# 运行冒烟测试
npm run test:smoke

# 检查余额
curl -X POST https://rpc.sepolia.org \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_getBalance","params":["你的地址","latest"],"id":1}'

# TypeScript 编译检查
npx tsc --noEmit
```

### 官方资源

- ERC-8004 规范: https://eips.ethereum.org/EIPS/eip-8004
- 官方合约: https://github.com/erc-8004/erc-8004-contracts
- Sepolia 浏览器: https://sepolia.etherscan.io/
- Sepolia 水龙头: https://sepoliafaucet.com/

---

**生成时间**: 2026-02-06
**预计完成时间**: 5 分钟（假设有测试 ETH）
**下次更新**: 测试成功后
