# 最终执行步骤（无需确认，直接做）

## 第1步：申请 Alchemy API Key（2分钟）

```bash
# 1. 打开浏览器访问
open https://www.alchemy.com/

# 2. 注册/登录后：
#    - Click "Create App"
#    - Chain: Ethereum
#    - Network: Ethereum Sepolia
#    - 复制 HTTPS URL（格式：https://eth-sepolia.g.alchemy.com/v2/xxxxx）
```

## 第2步：更新 .env（10秒）

```bash
# 直接编辑 .env 文件，替换 RPC_URL 那一行为：
RPC_URL="https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY_HERE"
```

或使用命令：

```bash
# 备份旧的 .env
cp .env .env.backup

# 手动编辑（把 YOUR_API_KEY_HERE 替换为真实 API key）
nano .env
```

## 第3步：运行测试（30秒）

```bash
# 运行测试并保存完整输出
npm run test:smoke 2>&1 | tee test-output.txt

# 测试完成后查看输出
cat test-output.txt
```

## 第4步：提取关键验证点

运行测试后，在输出中找到这些值：

### 必须验证的关键点

1. **IdentityRegistry bytecode 长度**
   - 在输出中找到类似：`Bytecode 长度: XXXX 字节`
   - 应该 > 10000 字节

2. **ReputationRegistry bytecode 长度**
   - 同样应该 > 5000 字节

3. **任意合约读方法的返回值**
   - 如果测试包含合约调用，记录返回值

### 检查清单

```bash
# 在 test-output.txt 中搜索关键词
grep -i "bytecode" test-output.txt
grep -i "合约" test-output.txt
grep -i "✅" test-output.txt
grep -i "❌" test-output.txt
```

## 备选：如果 Alchemy 注册有问题

使用 Infura（同样稳定）：

```bash
# 1. 访问 https://infura.io/
# 2. 注册 → 创建项目 → 复制 Sepolia 端点
# 3. 格式：https://sepolia.infura.io/v3/YOUR_PROJECT_ID

# 更新 .env
RPC_URL="https://sepolia.infura.io/v3/YOUR_PROJECT_ID"
```

## 如果测试需要 ETH

```bash
# 测试钱包地址
0xF8ce6Ae465d14dc8Be9C249D4872D0b60B083C63

# 获取测试 ETH（选一个）
open https://sepoliafaucet.com/
open https://faucet.quicknode.com/ethereum/sepolia
```

## 完成后需要的输出

将 `test-output.txt` 的内容发给我，特别标注：

1. IdentityRegistry bytecode 长度: ______ 字节
2. ReputationRegistry bytecode 长度: ______ 字节
3. 任何报错信息
4. 任何成功的合约调用返回值

---

**执行时间估计**：5 分钟（包括申请 API key）

**不要问，直接做完后发结果！**
