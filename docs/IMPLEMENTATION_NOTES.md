# 实现说明

## 1. 四维度评分实现

### 实际数据情况（2026-02-06）

根据 Sepolia Testnet 的实际查询（73 条 Feedback）：

- **tag1 使用率**: 87.7%
  - 主要标签: `quality` (21), `starred` (15), `compliance/execution/Efficiency` (各3)
  - ✅ 可用标签: `quality` → accuracy 维度

- **tag2 使用率**: 64.4%
  - 大多是地址和测试标记
  - ✅ 可用标签: `speed` (仅1次)

- **value 分布**:
  - 正面反馈: 97.3%
  - 负面反馈: 0%
  - 分值范围: 10-100（已标准化为 0-100）

### 评分策略（已实现）

```typescript
// intelligent-matching-service.ts & api/v1/reputation.ts

function extractDimensionScores(tagScores, totalFeedbacks, averageScore) {
  // 方案 A：如果有标签数据，尝试提取
  if (hasTagData) {
    // 映射规则:
    // - accuracy: quality, correctness, accuracy
    // - reliability: reliability, uptime, stability
    // - speed: speed, latency, response-time, performance
    // - value: value, cost, price, cost-effectiveness

    if (至少有一个维度有数据) {
      return 标签评分结果;
    }
  }

  // 方案 B（降级 - 当前主要使用）：
  // 使用 averageScore (0-5) 转换为 0-100
  // 所有维度使用同一个分数
  const overall = averageScore * 20;
  return {
    accuracy: overall,
    reliability: overall,
    speed: overall,
    value: overall,
  };
}
```

### 为什么降级方案更合理？

1. **标签覆盖度不够**: 虽然 87.7% 有 tag1，但大多数是 `starred`（收藏标记）而不是维度评价
2. **没有负面反馈**: 97.3% 都是正面，无法区分质量差异
3. **value 已经是综合评分**: 用户给的 value (10-100) 已经反映了整体满意度
4. **可扩展性**: 当未来有更多规范标签时，自动切换到方案 A

### 测试验证

运行查询脚本查看实际数据：

```bash
npx tsx scripts/check-feedback-tags.ts
```

## 2. 事件监听器（Event Indexer）

### ⚠️ 当前状态：Phase 2 功能，暂不部署

文件位置: `src/erc8004/event-indexer.ts`

### 为什么不能在 Vercel 部署？

- **设计**: 长期运行的轮询任务 (`while (this.isRunning)`)
- **限制**: Vercel Serverless Functions 有超时限制
  - Hobby: 10 秒
  - Pro: 300 秒（5 分钟）
- **问题**: EventIndexer 会被 Vercel 强制杀死

### 部署方案选择

#### 方案 A: Vercel Cron Jobs（推荐）

改造为增量同步函数:

```typescript
// api/cron/sync-events.ts
export default async function handler(req, res) {
  const db = new DatabaseService();
  const lastBlock = await db.getSyncStatus('sepolia');

  const indexer = new EventIndexer({
    network: 'sepolia',
    startBlock: lastBlock
  });

  // 同步 100 个区块
  await indexer.syncBlocks(lastBlock, lastBlock + 100n);
  await db.updateSyncStatus('sepolia', lastBlock + 100n);

  return res.json({ success: true });
}
```

配置 `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/sync-events",
    "schedule": "* * * * *"  // 每分钟
  }]
}
```

**优点**: 不需要额外服务
**缺点**: Cron 需要 Pro 计划（$20/月）

#### 方案 B: Railway/Render（独立服务）

将 EventIndexer 部署为独立 Node.js 服务:

```bash
# 部署到 Railway
railway init
railway up
```

**优点**: 可以长期运行，成本低（$5/月）
**缺点**: 需要管理额外的服务

#### 方案 C: 暂不部署（MVP 推荐）

- ✅ **当前方案**: 只依赖 The Graph Subgraph 实时数据
- ✅ **数据库用途**: 缓存和分析，不做实时同步
- ✅ **优点**: 最简单，MVP 功能完整
- ❌ **缺点**: 无法自定义索引逻辑

### 结论

**MVP 阶段使用方案 C**，等有实际需求时再部署 Event Indexer。

## 3. PostgreSQL 数据库

### 推荐方案: Supabase（免费额度充足）

1. 注册 Supabase: https://supabase.com
2. 创建新项目
3. 运行 schema.sql:
   ```bash
   psql postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres \
     -f src/database/schema.sql
   ```
4. 配置环境变量:
   ```
   DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
   ```

### 可选方案

- **Neon**: Serverless PostgreSQL，免费额度 0.5 GB
- **Railway**: $5/月，512 MB RAM
- **Render**: 免费层 256 MB RAM（90 天过期）

## 4. 部署清单

### 必需环境变量（MVP 最小配置）

```bash
# Claude API（智能匹配）- 必需
ANTHROPIC_API_KEY=sk-ant-xxx

# Vercel KV（缓存 + x402 交易验证）- 已配置
KV_REST_API_URL=https://...
KV_REST_API_TOKEN=...

# x402 支付接收地址 - 已配置
X402_RECEIVE_ADDRESS=0x...
```

### 可选环境变量（不影响 MVP 功能）

```bash
# PostgreSQL（用于 Event Indexer，Phase 2 功能）
DATABASE_URL=postgresql://...

# 如果不配置 DATABASE_URL：
# ✅ /api/v1/match 正常工作（依赖 Subgraph）
# ✅ /api/v1/search 正常工作（依赖 Subgraph）
# ✅ /api/v1/reputation 正常工作（依赖 Subgraph）
# ❌ Event Indexer 无法启动（但 MVP 不需要）

# 网络配置（默认 sepolia）
ERC8004_NETWORK=sepolia
SEPOLIA_RPC_URL=https://...
```

### 为什么 DATABASE_URL 可选？

**核心服务不依赖数据库：**
1. `IntelligentMatchingService` → 使用 Subgraph 查询
2. `AgentSearchService` → 使用 Subgraph 查询
3. `ReputationAggregator` → 使用 Subgraph 查询
4. `CacheService` → 使用 Vercel KV（Redis）

**数据库仅用于：**
- `EventIndexer`（Phase 2 功能，暂不部署）
- 自定义索引逻辑（未来功能）

**验证：**
```bash
# 检查 match API 是否依赖数据库
grep -r "DatabaseService" src/erc8004/intelligent-matching-service.ts
# → 无结果 ✅
```

### 验证部署

```bash
# 测试智能匹配 API
curl -X POST https://your-domain.vercel.app/api/v1/match \
  -H "Content-Type: application/json" \
  -d '{
    "task": "我需要一个能分析区块链数据的 Agent",
    "limit": 5
  }'

# 测试声誉查询 API
curl https://your-domain.vercel.app/api/v1/reputation/sepolia/11155111:608
```

## 5. 性能预期

### Claude API 成本

- **模型**: claude-3-5-sonnet-20241022
- **每次匹配**: ~500 tokens input + ~200 tokens output
- **成本**: ~$0.002/请求
- **月成本**: 1000 次匹配 = $2

### 响应时间

- **无缓存**: 2-5 秒（Claude API + Subgraph 查询）
- **有缓存**: 100-300ms（Redis）
- **Subgraph**: 500-1000ms

### 建议

- 对高频查询启用 Redis 缓存（已实现，TTL 5 分钟）
- 考虑实现请求限流（防止滥用 Claude API）

## 6. 已知限制

1. **四维度评分**: 当前主要使用平均分降级方案，等待更多规范标签数据
2. **事件监听器**: Phase 2 功能，暂不部署
3. **PostgreSQL**: 可选功能，不影响核心匹配能力
4. **负面反馈**: 当前数据中几乎没有负面反馈，无法验证负面评分逻辑

## 7. 下一步优化建议

1. **向量嵌入**: 使用 Claude Embeddings 替代 Jaccard 相似度
2. **标签规范化**: 在文档中引导用户使用标准标签
3. **反馈质量**: 鼓励用户提供更细粒度的标签评价
4. **个性化推荐**: 基于用户历史匹配记录优化推荐
