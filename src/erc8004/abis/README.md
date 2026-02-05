# ✅ 官方 ABI 文件

## 状态：已完成

官方 ABI 文件已从 [erc-8004/erc-8004-contracts](https://github.com/erc-8004/erc-8004-contracts) 仓库获取。

### 已包含的文件

- ✅ **IdentityRegistry.json** (19.5 KB) - ERC-721 based agent registration (upgradeable)
- ✅ **ReputationRegistry.json** (8.5 KB) - Feedback + aggregation (upgradeable)
- ✅ **ValidationRegistry.json** (9.4 KB) - Validation request/response (upgradeable)

### 获取日期

2026-02-06

### 来源

```bash
# 克隆命令（已执行）
git clone https://github.com/erc-8004/erc-8004-contracts.git /tmp/erc8004-contracts

# 复制命令（已执行）
cp /tmp/erc8004-contracts/abis/*.json src/erc8004/abis/
```

### 验证

```bash
# 验证文件存在
ls -lh src/erc8004/abis/

# 输出：
# IdentityRegistry.json    (19.5 KB)
# ReputationRegistry.json  (8.5 KB)
# ValidationRegistry.json  (9.4 KB)

# 验证 JSON 格式
jq empty src/erc8004/abis/*.json && echo "✅ 所有 ABI 文件格式正确"
```

### 注意事项

⚠️ **文件名注意**：官方文件名是 `IdentityRegistry.json`（不是 `IdentityRegistryUpgradeable.json`），虽然合约本身是 upgradeable 的。

这意味着在 `contracts-v2.ts` 中应该这样导入：

```typescript
// ✅ 正确
import IdentityRegistryABI from './abis/IdentityRegistry.json' assert { type: 'json' };

// ❌ 错误
import IdentityRegistryABI from './abis/IdentityRegistryUpgradeable.json' assert { type: 'json' };
```

### 更新 ABI

如果官方合约升级，重新运行获取命令：

```bash
cd /tmp
rm -rf erc8004-contracts
git clone https://github.com/erc-8004/erc-8004-contracts.git
cp erc8004-contracts/abis/*.json /path/to/x402-mcp-server/src/erc8004/abis/
```

---

**最后更新**: 2026-02-06
**来源仓库**: https://github.com/erc-8004/erc-8004-contracts
**官方团队**: Marco De Rossi (MetaMask), Davide Crapis (EF), Jordan Ellis (Google), Erik Reppel (Coinbase)
