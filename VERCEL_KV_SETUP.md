# Vercel KV (Redis) 配置指南

## 📋 概述

本项目已迁移到使用 **Vercel KV** (Redis) 进行速率限制和缓存管理。这解决了内存存储在函数重启时丢失数据的问题。

## 🎯 优势

| 功能 | 内存存储 | Vercel KV (Redis) |
|------|---------|------------------|
| 持久性 | ✗ 函数重启丢失 | ✓ 永久持久化 |
| 跨实例共享 | ✗ 每个实例独立 | ✓ 所有实例共享 |
| 性能 | 极快 | 非常快 (< 5ms) |
| 成本 | $0 | $0 (免费层) |
| 容量 | 受限于内存 | 256MB (免费层) |

## 🚀 配置步骤

### 1. 创建 Vercel KV 数据库

```bash
# 方法 A: 通过 Vercel Dashboard（推荐）
# 1. 访问 https://vercel.com/dashboard
# 2. 选择你的项目
# 3. 点击 "Storage" 标签
# 4. 点击 "Create Database" → 选择 "KV"
# 5. 数据库名称: x402-kv
# 6. 区域: 选择离你用户最近的（推荐: Washington, D.C.）
# 7. 点击 "Create"

# 方法 B: 通过 CLI
vercel link  # 如果还没有链接项目
vercel env add KV_REST_API_URL
vercel env add KV_REST_API_TOKEN
vercel env add KV_REST_API_READ_ONLY_TOKEN
```

### 2. 连接到项目

在 Vercel Dashboard 的 Storage 页面：

1. 选择刚创建的 KV 数据库
2. 点击 "Connect Project"
3. 选择 `x402-mcp-server` 项目
4. 确认连接

Vercel 会自动添加以下环境变量：
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`
- `KV_REST_API_READ_ONLY_TOKEN`

### 3. 本地开发配置

创建 `.env.local` 文件（已在 .gitignore 中）：

```bash
# 从 Vercel Dashboard → Storage → 你的 KV 数据库 → .env.local 标签复制
KV_REST_API_URL="https://xxxxx.kv.vercel-storage.com"
KV_REST_API_TOKEN="xxxxxxxxxxxxx"
KV_REST_API_READ_ONLY_TOKEN="xxxxxxxxxxxxx"
```

### 4. 部署

```bash
# 安装依赖
npm install

# 部署到 Vercel（环境变量已自动配置）
vercel --prod
```

## 📊 使用说明

### 速率限制

系统会自动使用 Redis 存储速率限制数据：

```typescript
// 免费层: 10 次请求/天/IP
// 付费层: 60 次请求/分钟/交易哈希

// Redis 存储键格式：
rate_limit:free:192.168.1.1 → { count: 5, resetTime: 1234567890, tier: 'free' }
rate_limit:paid:0xabc123... → { count: 15, resetTime: 1234567890, tier: 'paid' }
```

### 缓存管理

系统使用 5 个独立的缓存实例：

```typescript
// 1. 代币价格缓存 (30秒 TTL)
cache:token_price:WETH:ethereum → { price: 2899.10, ... }

// 2. 流动池分析缓存 (60秒 TTL)
cache:pool_analytics:0x88e6... → { tvl: 1000000, ... }

// 3. 合约安全缓存 (5分钟 TTL)
cache:contract_safety:0xC02a... → { riskScore: 0, ... }

// 4. 多链价格缓存 (30秒 TTL)
cache:multichain_price:WETH → { prices: {...}, ... }

// 5. 鲸鱼交易缓存 (2分钟 TTL)
cache:whale_tx:0xC02a... → { transactions: [...], ... }
```

## 🔍 监控和调试

### 查看 Redis 数据

```bash
# 安装 Vercel KV CLI
npm i -g @vercel/kv

# 连接到 Redis
vercel kv connect x402-kv

# 查看所有键
KEYS *

# 查看特定键
GET rate_limit:free:192.168.1.1
GET cache:token_price:WETH:ethereum

# 查看 TTL
TTL rate_limit:free:192.168.1.1

# 删除键（管理员操作）
DEL rate_limit:free:192.168.1.1
```

### 查看使用统计

在 Vercel Dashboard → Storage → x402-kv：
- 请求数量
- 数据大小
- 命令统计
- 响应时间

## 💰 免费层限制

Vercel KV 免费层（Hobby 计划）：

| 资源 | 限制 | 当前使用 | 状态 |
|------|------|---------|------|
| 存储空间 | 256 MB | < 1 MB | ✓ 充足 |
| 每日请求 | 30万次 | ~1000次 | ✓ 充足 |
| 每日带宽 | 100 MB | < 1 MB | ✓ 充足 |
| 数据库数量 | 1 | 1 | ✓ OK |

**预估使用情况：**
- 每次 API 请求: 2 次 Redis 操作（速率限制读写）
- 每次缓存命中: 1 次 Redis 读取
- 每日 1000 个 API 请求 = ~3000 次 Redis 操作
- **完全在免费限额内！**

## ⚠️ 重要注意事项

### 1. 环境变量保密

**绝不要**将以下内容提交到 Git：
- `.env.local` 文件
- `KV_REST_API_TOKEN` 值
- Redis 连接字符串

已在 `.gitignore` 中配置：
```
.env
.env.local
.env.*.local
```

### 2. 错误处理

Redis 不可用时，系统会：
- 记录错误日志
- **Fail open**: 允许请求继续（而不是拒绝）
- 返回默认值避免服务中断

```typescript
// redis-rate-limiter.ts 中的容错逻辑
catch (error: any) {
  logger.error('Redis error, failing open', error);
  return { allowed: true, remaining: 999 };
}
```

### 3. 数据迁移

如果从内存存储迁移：
- 旧的速率限制计数器**不会**自动迁移
- 用户可能需要重新开始计数（从 0 开始）
- 这是**预期行为**，不影响用户体验

## 🧪 测试

### 本地测试

```bash
# 1. 确保 .env.local 已配置
cat .env.local

# 2. 运行测试
curl http://localhost:3000/api/x402/tokens/price?token_address=0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2&chain=ethereum

# 3. 检查 Redis（通过 Vercel Dashboard 或 CLI）
vercel kv connect x402-kv
GET rate_limit:free:127.0.0.1
```

### 生产测试

```bash
# 1. 测试免费层速率限制
for i in {1..12}; do
  echo "请求 $i:"
  curl -s "https://x402-mcp-server.vercel.app/api/x402/tokens/price?token_address=0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2&chain=ethereum" | jq -r '.meta.tier // .error'
done

# 预期结果:
# 请求 1-10: "free" (成功)
# 请求 11-12: "Rate limit exceeded" (429 错误)
```

## 📚 相关文件

| 文件 | 说明 |
|------|------|
| `src/redis-rate-limiter.ts` | Redis 速率限制服务 |
| `src/redis-cache-manager.ts` | Redis 缓存管理器 |
| `src/api-middleware.ts` | API 中间件（已更新使用 Redis） |
| `package.json` | 添加了 `@vercel/kv` 依赖 |

## 🔄 回滚计划

如果需要回滚到内存存储：

```typescript
// 1. 在 src/api-middleware.ts 中
import { rateLimiter } from './rate-limiter.js';  // 改回旧版本
// import { redisRateLimiter } from './redis-rate-limiter.js';

// 2. 移除所有 await 关键字
const rateCheck = rateLimiter.checkLimit(identifier, 'free');  // 移除 await

// 3. 重新部署
vercel --prod
```

## 🎉 完成！

配置完成后，您的服务将具备：
- ✓ 持久化的速率限制（不会因重启丢失）
- ✓ 跨所有函数实例共享的缓存
- ✓ 更准确的速率限制执行
- ✓ 更好的用户体验
- ✓ 完全免费

如有问题，请查看 Vercel Dashboard 中的日志或联系支持。
