# ERC-8004 + x402 部署前检查清单

## 🚨 关键原则

**在部署到生产环境之前，必须完成以下所有检查项。**

- ❌ = 未完成（阻止部署）
- ⚠️ = 部分完成（需要验证）
- ✅ = 已完成并验证

---

## 第一部分：官方数据获取（阻塞项）

### 1. ✅ 官方 ABI 文件

**当前状态**: ❌ 未获取

**检查步骤**:

```bash
# 1. 克隆官方仓库
git clone https://github.com/erc-8004/erc-8004-contracts.git /tmp/erc8004

# 2. 检查 ABI 文件是否存在
ls /tmp/erc8004/abis/

# 3. 复制到项目
cp /tmp/erc8004/abis/IdentityRegistryUpgradeable.json src/erc8004/abis/
cp /tmp/erc8004/abis/ReputationRegistryUpgradeable.json src/erc8004/abis/
cp /tmp/erc8004/abis/ValidationRegistryUpgradeable.json src/erc8004/abis/

# 4. 验证文件存在
ls -lh src/erc8004/abis/*.json
```

**验证标准**:
- [ ] IdentityRegistryUpgradeable.json 文件大小 > 10KB
- [ ] ReputationRegistryUpgradeable.json 文件大小 > 10KB
- [ ] ValidationRegistryUpgradeable.json 文件大小 > 5KB
- [ ] 所有 JSON 文件格式正确（可用 `jq` 验证）

**阻塞原因**: 没有官方 ABI 则无法与链上合约交互

---

### 2. ✅ The Graph Subgraph URL

**当前状态**: ❌ 使用 TODO 占位符

**检查步骤**:

```bash
# 1. 访问 The Graph Explorer
open https://thegraph.com/explorer

# 2. 搜索关键词
# - "erc8004"
# - "trustless agents"
# - "agent0"

# 3. 确认官方 Subgraph
# - 发布者: Agent0 团队或官方认证
# - 网络: Ethereum Sepolia / Mainnet
# - 状态: Synced

# 4. 复制 Query URL 格式：
# https://api.studio.thegraph.com/query/{id}/{name}/version/latest
# 或
# https://gateway.thegraph.com/api/{key}/subgraphs/id/{id}
```

**更新位置**: [src/erc8004/graph-client-v2.ts](src/erc8004/graph-client-v2.ts:34)

```typescript
const SUBGRAPH_URLS: Record<string, string> = {
  sepolia: 'https://api.studio.thegraph.com/query/XXXXX/erc8004-sepolia/version/latest',
  mainnet: 'https://gateway.thegraph.com/api/XXXXX/subgraphs/id/XXXXX',
};
```

**验证标准**:
- [ ] Sepolia Subgraph URL 已更新
- [ ] Mainnet Subgraph URL 已更新
- [ ] 测试查询成功（见下方测试脚本）

```bash
# 测试 Subgraph 连接
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"query": "{ _meta { block { number } } }"}' \
  YOUR_SUBGRAPH_URL
```

**阻塞原因**: 没有 Subgraph 则无法查询链上历史数据

---

### 3. ✅ 合约地址验证

**当前状态**: ⚠️ 已使用官方地址，但需要验证

**检查步骤**:

```bash
# 1. 检查 Sepolia IdentityRegistry
cast code 0x8004A818BFB912233c491871b3d84c89A494BD9e --rpc-url $SEPOLIA_RPC_URL

# 2. 检查 Sepolia ReputationRegistry
cast code 0x8004B663056A597Dffe9eCcC1965A193B7388713 --rpc-url $SEPOLIA_RPC_URL

# 3. 检查 Mainnet IdentityRegistry
cast code 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432 --rpc-url $MAINNET_RPC_URL

# 4. 检查 Mainnet ReputationRegistry
cast code 0x8004BAa17C55a88189AE136b182e5fdA19dE9b63 --rpc-url $MAINNET_RPC_URL
```

**验证标准**:
- [ ] 所有地址返回非空 bytecode
- [ ] Bytecode 长度 > 1000 字节
- [ ] 在 Etherscan 上有验证标记

**对照源**: [github.com/erc-8004/erc-8004-contracts](https://github.com/erc-8004/erc-8004-contracts#deployments)

---

## 第二部分：代码完整性检查

### 4. ✅ 移除 TODO 标记

**检查命令**:

```bash
# 搜索所有 TODO 标记
grep -r "TODO" src/erc8004/ --include="*.ts"
grep -r "TODO_GET_FROM" src/erc8004/ --include="*.ts"
grep -r "待补充" src/erc8004/ --include="*.ts"
```

**验证标准**:
- [ ] contracts-v2.ts: 所有 ABI 导入已取消注释
- [ ] graph-client-v2.ts: SUBGRAPH_URLS 不含 "TODO"
- [ ] 所有 "TODO" 注释已删除或替换为实际代码

---

### 5. ✅ TypeScript 编译检查

```bash
# 清理并重新编译
npm run clean
npm run build

# 检查编译输出
ls -lh dist/erc8004/
```

**验证标准**:
- [ ] 编译成功，无错误
- [ ] 警告数量 = 0（或仅有合理的警告）
- [ ] dist/ 目录包含所有 .js 和 .d.ts 文件

---

### 6. ✅ x402 支付配置（USDC）

**检查位置**: [src/x402/payment-middleware.ts](src/x402/payment-middleware.ts)

**验证标准**:
- [ ] 所有价格使用 USDC（6 位小数）
- [ ] USDC 合约地址正确:
  - Base: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
  - Base Sepolia: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
  - Sepolia: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`
  - Mainnet: `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`
- [ ] 没有使用 ETH 作为支付货币
- [ ] `X402_RECEIVE_ADDRESS` 环境变量已配置

```bash
# 验证 USDC 地址（Base Mainnet）
cast code 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 --rpc-url $BASE_RPC_URL
```

---

## 第三部分：测试验证

### 7. ✅ Sepolia 冒烟测试

**运行测试**:

```bash
# 确保环境变量已设置
export X402_WALLET_PRIVATE_KEY="0x..."
export X402_RPC_URL="https://sepolia.infura.io/v3/..."
export ERC8004_NETWORK="sepolia"

# 运行冒烟测试
npm run test:smoke
```

**测试脚本**: [test/smoke-test-sepolia.ts](test/smoke-test-sepolia.ts)

**验证标准**:
- [ ] 钱包余额检查通过（> 0.01 ETH）
- [ ] IdentityRegistry 合约可访问
- [ ] ReputationRegistry 合约可访问
- [ ] 注册文件格式符合 EIP-8004 schema
- [ ] 测试输出无错误

---

### 8. ✅ The Graph 查询测试

**测试脚本**:

```bash
# 创建测试文件
cat > test/test-graph-query.ts <<'EOF'
import { ERC8004GraphClient } from '../src/erc8004/graph-client-v2.js';

async function testGraphQueries() {
  const client = new ERC8004GraphClient('sepolia');

  console.log('Testing basic query...');
  const agents = await client.getAgents(5, 0);
  console.log(`✅ Fetched ${agents.length} agents`);
  console.log(agents[0]);
}

testGraphQueries().catch(console.error);
EOF

# 运行测试
npx tsx test/test-graph-query.ts
```

**验证标准**:
- [ ] 查询返回数据（不抛出错误）
- [ ] 返回的字段名与代码中一致
- [ ] 数据结构符合预期

---

### 9. ✅ x402 支付端点测试

**测试脚本**:

```bash
# 测试 402 响应
curl -v http://localhost:3000/api/erc8004?action=premium-search&limit=50

# 预期响应: HTTP 402 Payment Required
# 预期内容: 包含 USDC 支付信息
```

**验证标准**:
- [ ] 返回 402 状态码
- [ ] 响应包含 `accepts` 数组
- [ ] `asset` 字段是 USDC 合约地址
- [ ] `maxAmountRequired` 是正确的 USDC 金额

---

## 第四部分：安全检查

### 10. ✅ 私钥管理

**检查项**:

```bash
# 1. 确认 .env 文件不在 git 中
grep -q "^.env$" .gitignore && echo "✅ .env 已忽略" || echo "❌ .env 未忽略"

# 2. 确认示例文件不含真实密钥
grep "0x[a-fA-F0-9]{64}" .env.example && echo "❌ 示例文件含私钥！" || echo "✅ 无私钥"

# 3. 检查 Vercel 环境变量是否配置
vercel env ls
```

**验证标准**:
- [ ] `.env` 在 `.gitignore` 中
- [ ] `.env.example` 不含真实私钥
- [ ] Vercel 环境变量已配置:
  - `X402_WALLET_PRIVATE_KEY`
  - `X402_RPC_URL`
  - `X402_RECEIVE_ADDRESS`
  - `ERC8004_NETWORK`
- [ ] 使用的钱包是专用测试钱包（余额 < 0.1 ETH）

---

### 11. ✅ RPC URL 安全

**检查项**:

- [ ] RPC URL 使用环境变量（不硬编码）
- [ ] 有 API key 的 RPC URL 不在代码中
- [ ] Infura/Alchemy key 已设置使用限制（IP 或域名）

---

### 12. ✅ 依赖安全审计

```bash
# 运行安全审计
npm audit

# 修复可自动修复的问题
npm audit fix

# 检查高危漏洞
npm audit --audit-level=high
```

**验证标准**:
- [ ] 无高危（high）漏洞
- [ ] 无严重（critical）漏洞
- [ ] 中危（moderate）漏洞 < 5 个

---

## 第五部分：文档和配置

### 13. ✅ 环境变量文档

**检查文件**: [.env.example](.env.example)

**验证标准**:
- [ ] 所有必需的环境变量都有示例
- [ ] 注释清晰，说明每个变量的用途
- [ ] 包含安全警告（不要使用主钱包）

---

### 14. ✅ README 更新

**检查项**:

- [ ] README.md 包含 ERC-8004 功能说明
- [ ] 快速开始部分准确
- [ ] 合约地址是最新的官方地址
- [ ] 价格示例使用 USDC（不是 ETH）

---

### 15. ✅ API 文档

**检查项**:

- [ ] 所有 HTTP 端点有文档
- [ ] 示例请求/响应准确
- [ ] 说明哪些端点免费，哪些需要 x402 支付
- [ ] 错误码和错误信息有说明

---

## 第六部分：部署配置

### 16. ✅ Vercel 配置

**检查文件**: [vercel.json](vercel.json)

**验证标准**:

```json
{
  "functions": {
    "api/**/*.ts": {
      "memory": 1024,
      "maxDuration": 10
    }
  },
  "env": {
    "X402_WALLET_PRIVATE_KEY": "@x402-wallet-key",
    "X402_RPC_URL": "@x402-rpc-url",
    "X402_RECEIVE_ADDRESS": "@x402-receive-address",
    "ERC8004_NETWORK": "sepolia"
  }
}
```

- [ ] 环境变量引用正确的 Vercel Secrets
- [ ] 函数内存和超时设置合理
- [ ] 区域设置（如有）适合用户分布

---

### 17. ✅ 数据库准备（如使用）

**检查项**:

- [ ] 数据库 schema 已应用 (src/erc8004/database-schema.sql)
- [ ] 数据库连接字符串在环境变量中
- [ ] 数据库有定期备份
- [ ] 索引已创建

---

## 第七部分：最终验证

### 18. ✅ 端到端测试

**测试流程**:

1. **注册 Agent**
   ```bash
   curl -X POST https://your-domain.vercel.app/api/erc8004?action=register \
     -H "Content-Type: application/json" \
     -d '{
       "name": "E2E Test Agent",
       "metadata": {
         "description": "End-to-end test",
         "capabilities": ["test"],
         "tags": ["testing"]
       }
     }'
   ```

2. **等待 The Graph 索引**（1-5 分钟）

3. **搜索 Agent**
   ```bash
   curl "https://your-domain.vercel.app/api/erc8004?action=search&keyword=E2E"
   ```

4. **获取 Agent 详情**
   ```bash
   curl "https://your-domain.vercel.app/api/erc8004?action=agent&id={agentId}"
   ```

5. **提交反馈**
   ```bash
   curl -X POST https://your-domain.vercel.app/api/erc8004?action=submit-feedback \
     -H "Content-Type: application/json" \
     -d '{
       "agentId": "{agentId}",
       "rating": 5,
       "comment": "E2E test feedback"
     }'
   ```

6. **测试 x402 付费端点**
   ```bash
   curl "https://your-domain.vercel.app/api/erc8004?action=premium-search&limit=50"
   # 应返回 402 + USDC 支付信息
   ```

**验证标准**:
- [ ] 所有步骤成功执行
- [ ] 交易在区块链浏览器可见
- [ ] The Graph 正确索引新数据
- [ ] 付费端点返回正确的 402 响应

---

### 19. ✅ 监控和日志

**检查项**:

- [ ] Vercel 日志可访问
- [ ] 错误追踪已配置（Sentry 或类似）
- [ ] 关键操作有日志记录
- [ ] 有告警机制（RPC 故障、支付失败等）

---

### 20. ✅ 回滚计划

**准备项**:

- [ ] 文档化回滚步骤
- [ ] 保留上一个稳定版本的部署
- [ ] 知道如何快速切换 Vercel 部署
- [ ] 有数据库回滚脚本（如适用）

---

## 部署前最终确认

在执行 `vercel --prod` 之前，确认：

```bash
# 1. 所有测试通过
npm test

# 2. 构建成功
npm run build

# 3. 环境变量已设置
vercel env ls | grep X402_WALLET_PRIVATE_KEY
vercel env ls | grep X402_RPC_URL
vercel env ls | grep X402_RECEIVE_ADDRESS

# 4. Sepolia 冒烟测试通过
npm run test:smoke

# 5. 无 TODO 标记
! grep -r "TODO_GET_FROM" src/erc8004/ --include="*.ts"

# 6. Git 状态干净
git status
```

**最终检查清单**:

- [ ] ✅ 官方 ABI 文件已获取并导入
- [ ] ✅ The Graph Subgraph URL 已配置
- [ ] ✅ 合约地址已验证为官方地址
- [ ] ✅ 所有 TODO 标记已移除
- [ ] ✅ TypeScript 编译无错误
- [ ] ✅ x402 使用 USDC（不是 ETH）
- [ ] ✅ Sepolia 冒烟测试通过
- [ ] ✅ The Graph 查询测试通过
- [ ] ✅ x402 支付端点测试通过
- [ ] ✅ 私钥管理安全
- [ ] ✅ 环境变量文档完整
- [ ] ✅ README 和 API 文档准确
- [ ] ✅ 端到端测试通过
- [ ] ✅ 监控和告警已配置
- [ ] ✅ 回滚计划已准备

---

## 部署命令

```bash
# 预览部署（测试）
vercel

# 生产部署
vercel --prod
```

---

## 部署后验证

```bash
# 1. 健康检查
curl https://your-domain.vercel.app/api/health

# 2. 测试 ERC-8004 搜索
curl "https://your-domain.vercel.app/api/erc8004?action=search&keyword=test"

# 3. 测试 x402 端点
curl "https://your-domain.vercel.app/api/erc8004?action=premium-search&limit=50"

# 4. 检查日志
vercel logs your-domain.vercel.app
```

---

## 常见问题排查

### Q: ABI 文件找不到

```bash
# 检查文件路径
ls -la src/erc8004/abis/
# 确保 .json 文件存在且可读
```

### Q: The Graph 查询失败

```bash
# 手动测试 Subgraph URL
curl -X POST YOUR_SUBGRAPH_URL \
  -H "Content-Type: application/json" \
  -d '{"query": "{ _meta { block { number } } }"}'
```

### Q: x402 支付验证失败

- 检查 USDC 合约地址是否正确
- 确认接收地址配置正确
- 验证支付金额格式（6 位小数）

### Q: Sepolia 测试失败（余额不足）

- 访问 [sepoliafaucet.com](https://sepoliafaucet.com/) 获取测试 ETH
- 确认钱包地址正确

---

**生成时间**: 2026-02-06
**维护者**: 部署前必须完成所有检查项
**下次更新**: 部署后根据实际情况更新
