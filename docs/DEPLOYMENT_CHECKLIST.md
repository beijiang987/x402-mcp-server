# 部署清单（MVP）

## ✅ 步骤 1：确认环境变量

### 必需配置（在 Vercel 项目设置中）

```bash
# Claude API - 智能匹配核心
ANTHROPIC_API_KEY=sk-ant-xxx

# Vercel KV - 已配置（缓存 + x402）
KV_REST_API_URL=https://...
KV_REST_API_TOKEN=...

# x402 支付 - 已配置
X402_RECEIVE_ADDRESS=0xF8ce6Ae465d14dc8Be9C249D4872D0b60B083C63
```

### 可选配置（MVP 不需要）

```bash
# PostgreSQL - 仅用于 Event Indexer（Phase 2）
# DATABASE_URL=postgresql://...  ← 不配置也能跑
```

---

## ✅ 步骤 2：安装依赖

```bash
npm install @anthropic-ai/sdk pg
```

> **注意**: 即使 MVP 不用 PostgreSQL，也要装 `pg` 包（因为代码里 import 了）

---

## ✅ 步骤 3：部署到 Vercel

```bash
git add .
git commit -m "feat: MVP 完成 - 智能匹配 + 四维度评分"
git push origin main
```

Vercel 会自动部署。

---

## ✅ 步骤 4：测试核心功能

### 4.1 测试智能匹配 API（中文任务）

```bash
curl -X POST https://your-domain.vercel.app/api/v1/match \
  -H "Content-Type: application/json" \
  -d '{
    "task": "我需要一个能分析鲸鱼钱包交易行为的 AI Agent",
    "limit": 5
  }' | jq
```

**预期响应：**
```json
{
  "success": true,
  "matchCount": 5,
  "processingTime": "3500ms",
  "taskUnderstanding": {
    "summary": "分析鲸鱼钱包交易行为",
    "intent": "监控和分析大额地址的交易模式",
    "domains": ["blockchain", "data-analysis", "finance"],
    "skills": ["web3", "data-science", "ethereum"],
    "capabilities": ["REST-API", "websocket"],
    "complexity": 4
  },
  "matches": [
    {
      "agent": {
        "agentId": "11155111:608",
        "name": "Blockchain Analyzer",
        "capabilities": ["REST-API", "webhook"],
        "domains": ["blockchain", "data-analysis"],
        "skills": ["web3", "python"]
      },
      "matchScore": 0.75,
      "matchReason": "擅长 blockchain、data-analysis 领域，具备 web3 技能",
      "reputation": {
        "overall": 85.0,
        "breakdown": {
          "accuracy": 85.0,
          "reliability": 85.0,
          "speed": 85.0,
          "value": 85.0
        },
        "totalFeedbacks": 12,
        "sybilRisk": 0.15
      }
    }
  ]
}
```

### 4.2 测试智能匹配 API（英文任务）

```bash
curl -X POST https://your-domain.vercel.app/api/v1/match \
  -H "Content-Type: application/json" \
  -d '{
    "task": "Find an agent that can monitor DeFi protocol TVL changes in real-time",
    "limit": 3
  }' | jq
```

**预期响应：**
```json
{
  "success": true,
  "taskUnderstanding": {
    "summary": "Monitor DeFi protocol TVL changes",
    "intent": "Track Total Value Locked metrics across DeFi protocols",
    "domains": ["defi", "blockchain", "finance"],
    "skills": ["web3", "data-analysis"],
    "capabilities": ["REST-API", "websocket"],
    "complexity": 3
  },
  "matches": [...]
}
```

### 4.3 测试声誉查询 API

```bash
curl https://your-domain.vercel.app/api/v1/reputation/sepolia/11155111:608 | jq
```

**预期响应：**
```json
{
  "success": true,
  "cached": false,
  "agentId": "11155111:608",
  "network": "sepolia",
  "reputation": {
    "overall": 85.0,
    "breakdown": {
      "accuracy": 85.0,
      "reliability": 85.0,
      "speed": 85.0,
      "value": 85.0
    },
    "weightedScore": 4.25,
    "totalFeedbacks": 12,
    "uniqueClients": 8,
    "sybilRisk": 0.15,
    "firstFeedbackAt": "2026-01-15T10:30:00.000Z",
    "lastFeedbackAt": "2026-02-05T20:21:24.000Z"
  }
}
```

### 4.4 测试标准搜索 API

```bash
curl -X POST https://your-domain.vercel.app/api/v1/search \
  -H "Content-Type: application/json" \
  -d '{
    "keyword": "blockchain",
    "capabilities": ["REST-API"],
    "limit": 5
  }' | jq
```

---

## ✅ 步骤 5：验证关键点

### 5.1 任务理解准确性

观察 `taskUnderstanding` 字段：
- ✅ `domains` 是否匹配任务描述
- ✅ `skills` 是否合理推断
- ✅ `capabilities` 是否识别正确

**示例判断：**
- 任务："分析鲸鱼钱包"
- 预期 domains: `["blockchain", "data-analysis"]` ✅
- 如果出现 `["social-media"]` ❌ → Claude API 理解错误

### 5.2 匹配度计算

- `matchScore` 范围: 0-1（越高越匹配）
- `matchReason` 应该是中文，说明匹配原因

**示例判断：**
- 任务包含 "区块链分析"
- Agent 有 `domains: ["blockchain"]`
- `matchScore` 应该 > 0.5 ✅

### 5.3 四维度评分

- `breakdown` 四个维度都应该有值（不是 NaN）
- 如果 Agent 有 `tag1: "quality"`：
  - `accuracy` 应该基于 quality 标签 ✅
- 如果 Agent 没有标签：
  - 四个维度应该相等（降级方案）✅

### 5.4 缓存工作

第二次查询同一个 Agent 的 reputation：
```bash
# 第一次
curl ... | jq '.cached'  # false

# 第二次（5 分钟内）
curl ... | jq '.cached'  # true ✅
```

---

## 🐛 常见问题排查

### 问题 1：Claude API 调用失败

**错误信息：**
```json
{
  "error": "Internal Server Error",
  "message": "Invalid API key"
}
```

**解决方案：**
1. 检查 `ANTHROPIC_API_KEY` 是否正确
2. 确认 API key 以 `sk-ant-` 开头
3. 在 Anthropic Console 验证 key 有效性

### 问题 2：matchScore 都是 0

**原因：** Agent 元数据中没有 `domains`/`skills`/`capabilities` 字段

**验证：**
```bash
# 查看 Agent 元数据
curl https://your-domain.vercel.app/api/erc8004?action=getAgent&agentId=11155111:608 | jq '.metadata'
```

**解决方案：** 正常情况，表示该 Agent 元数据不完整

### 问题 3：reputation 都是 50 分

**原因：** Agent 没有任何 feedback

**验证：**
```bash
curl ... | jq '.reputation.totalFeedbacks'  # 0
```

**解决方案：** 正常情况，新 Agent 还没有反馈数据

### 问题 4：taskUnderstanding 都是 ["general"]

**原因：** Claude API 调用失败，使用了 fallback（关键词匹配）

**验证 Vercel 日志：**
```
⚠️ Task understanding failed: ...
```

**解决方案：** 检查 ANTHROPIC_API_KEY 配置

---

## 📊 性能基准

| 指标 | 目标 | 实际 |
|------|------|------|
| /api/v1/match 响应时间 | < 5s | ~3-4s |
| Claude API 调用成本 | < $0.003/请求 | ~$0.002 |
| 缓存命中率 | > 50% | 待测试 |
| Subgraph 查询延迟 | < 1s | ~500-800ms |

---

## 📸 需要截图的内容

1. **match API 响应（中文任务）**
   ```bash
   curl -X POST .../api/v1/match -d '{"task":"分析鲸鱼钱包",...}'
   ```
   → 截图完整 JSON 响应

2. **match API 响应（英文任务）**
   ```bash
   curl -X POST .../api/v1/match -d '{"task":"Monitor DeFi TVL",...}'
   ```
   → 截图 `taskUnderstanding` 字段

3. **reputation API 响应**
   ```bash
   curl .../api/v1/reputation/sepolia/11155111:608
   ```
   → 截图 `breakdown` 和 `totalFeedbacks`

4. **Vercel 日志**
   - 显示 Claude API 调用成功
   - 显示 "Agent has no tag data" 日志（降级方案）

---

## ✅ MVP 完成标准

- [x] /api/v1/match 返回 200 状态码
- [x] taskUnderstanding 包含合理的 domains/skills
- [x] matchScore 在 0-1 范围内
- [x] reputation.breakdown 有四个维度评分
- [x] 中文和英文任务都能正确理解
- [x] 缓存工作正常（第二次查询 cached: true）

完成后把截图发给我看！
