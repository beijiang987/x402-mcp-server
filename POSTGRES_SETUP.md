# Vercel Postgres 配置指南

## 📋 概述

本项目使用 **Vercel Postgres** 存储支付历史和 API 使用统计。这提供了持久化的数据存储和强大的查询能力。

## 🎯 功能

- ✅ 支付记录追踪
- ✅ API 调用统计
- ✅ 速率限制事件记录
- ✅ 数据源性能监控
- ✅ 实时仪表板
- ✅ 收入分析

## 🚀 配置步骤

### 1. 创建 Postgres 数据库

```bash
# 方法 A: 通过 Vercel Dashboard（推荐）
# 1. 访问 https://vercel.com/dashboard
# 2. 选择你的项目: x402-mcp-server
# 3. 点击 "Storage" 标签
# 4. 点击 "Create Database" → 选择 "Postgres"
# 5. 数据库名称: x402-db
# 6. 区域: Washington, D.C. (推荐)
# 7. 点击 "Create"

# 方法 B: 通过 CLI
vercel link  # 如果还没有链接项目
vercel env add POSTGRES_URL
vercel env add POSTGRES_URL_NON_POOLING
```

### 2. 连接到项目

在 Vercel Dashboard 的 Storage 页面：

1. 选择刚创建的 Postgres 数据库
2. 点击 "Connect Project"
3. 选择 `x402-mcp-server` 项目
4. 确认连接

Vercel 会自动添加以下环境变量：
- `POSTGRES_URL` - 用于 Serverless Functions
- `POSTGRES_PRISMA_URL` - 用于 Prisma (可选)
- `POSTGRES_URL_NON_POOLING` - 用于迁移

### 3. 初始化数据库 Schema

有两种方式初始化数据库：

#### 方法 A: 通过 Vercel Dashboard (推荐)

1. 进入 Storage → x402-db → Query 标签
2. 复制 `schema.sql` 的全部内容
3. 粘贴到查询编辑器
4. 点击 "Execute"

#### 方法 B: 通过 psql 命令行

```bash
# 1. 从 Vercel Dashboard 复制连接字符串
# Storage → x402-db → .env.local 标签

# 2. 使用 psql 连接
psql "postgres://..."

# 3. 执行 schema
\i schema.sql

# 4. 验证表已创建
\dt
```

### 4. 验证数据库

```bash
# 在 Vercel Dashboard → Storage → x402-db → Query 中执行

-- 查看所有表
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public';

-- 应该看到：
-- payments
-- api_calls
-- rate_limit_events
-- data_source_calls

-- 查看视图
SELECT table_name FROM information_schema.views
WHERE table_schema = 'public';

-- 应该看到：
-- daily_revenue
-- endpoint_stats
-- realtime_stats
-- top_payers
```

## 📊 数据库结构

### 表结构

| 表名 | 说明 | 主要字段 |
|------|------|---------|
| `payments` | 支付记录 | tx_hash, amount_usd, endpoint |
| `api_calls` | API 调用统计 | endpoint, tier, response_time_ms |
| `rate_limit_events` | 限流事件 | identifier, blocked |
| `data_source_calls` | 数据源监控 | source, duration_ms |

### 视图

| 视图名 | 说明 |
|--------|------|
| `daily_revenue` | 每日收入统计 |
| `endpoint_stats` | 端点使用统计 |
| `realtime_stats` | 实时统计（24小时）|
| `top_payers` | 顶级付费者排行 |

## 🎨 管理仪表板

访问管理仪表板：
```
https://x402-mcp-server.vercel.app/dashboard.html
```

**功能：**
- 📊 实时统计卡片（24小时数据）
- 📈 端点使用情况表格
- 💰 每日收入趋势（虽然需要有支付数据）
- ⏱️ 每小时请求量图表
- 👑 顶级付费者排行榜
- 🔄 自动刷新（每 30 秒）

## 📡 API 端点

### GET /api/admin/stats

返回聚合统计数据：

```json
{
  "success": true,
  "data": {
    "realtime": {
      "totalCalls24h": 150,
      "paidCalls24h": 50,
      "freeCalls24h": 100,
      "uniqueIps24h": 35,
      "avgResponseTime24h": 250.5,
      "successRate24h": 98.5
    },
    "endpoints": [...],
    "revenue": [...],
    "hourly": [...],
    "topPayers": [...]
  }
}
```

## 🔍 常用查询

### 1. 查看最近支付

```sql
SELECT
  tx_hash,
  payer_address,
  amount_usd,
  endpoint,
  created_at
FROM payments
WHERE verified = true
ORDER BY created_at DESC
LIMIT 10;
```

### 2. 查看今日统计

```sql
SELECT * FROM realtime_stats;
```

### 3. 查看端点性能

```sql
SELECT * FROM endpoint_stats
ORDER BY total_calls DESC;
```

### 4. 查看每日收入

```sql
SELECT * FROM daily_revenue
LIMIT 30;
```

### 5. 查看最慢的请求

```sql
SELECT
  endpoint,
  response_time_ms,
  created_at
FROM api_calls
WHERE success = true
ORDER BY response_time_ms DESC
LIMIT 10;
```

## 💰 免费层限制

Vercel Postgres 免费层（Hobby 计划）：

| 资源 | 限制 | 预估使用 | 状态 |
|------|------|---------|------|
| 存储空间 | 256 MB | < 10 MB | ✓ 充足 |
| 每月计算时间 | 60 小时 | < 5 小时 | ✓ 充足 |
| 行数限制 | 无限制 | ~10万行/月 | ✓ OK |

**预估：**
- 每次 API 调用：1 行 `api_calls` 记录
- 每次支付：1 行 `payments` 记录
- 每日 1000 个请求 = 30000 行/月
- **完全在免费限额内！**

## ⚠️ 重要注意事项

### 1. 环境变量保密

**绝不要**将以下内容提交到 Git：
- `.env.local` 文件
- `POSTGRES_URL` 值
- 数据库连接字符串

已在 `.gitignore` 中配置：
```
.env
.env.local
.env.*.local
```

### 2. 错误处理

所有数据库操作都有容错处理：
- 数据库不可用时不会阻塞 API
- 失败时记录日志但继续服务
- 仪表板显示友好错误消息

### 3. 性能优化

数据库查询已优化：
- 所有关键字段已添加索引
- 使用视图预聚合数据
- 函数优化查询逻辑

### 4. 数据隐私

用户隐私保护：
- IP 地址经过 SHA-256 哈希处理
- 只存储必要的统计数据
- 符合 GDPR 原则

## 🧪 测试

### 本地测试（需要配置 POSTGRES_URL）

```bash
# 1. 确保 .env.local 已配置
cat .env.local | grep POSTGRES

# 2. 测试数据库连接
curl http://localhost:3000/api/admin/stats

# 3. 查看仪表板
open http://localhost:3000/dashboard.html
```

### 生产测试

```bash
# 1. 测试统计 API
curl https://x402-mcp-server.vercel.app/api/admin/stats

# 2. 访问仪表板
open https://x402-mcp-server.vercel.app/dashboard.html
```

## 📚 相关文件

| 文件 | 说明 |
|------|------|
| `schema.sql` | 数据库 Schema 定义 |
| `src/database.ts` | 数据访问层 |
| `api/admin/stats.ts` | 统计 API 端点 |
| `public/dashboard.html` | 管理仪表板 |

## 🔄 数据迁移

如果需要更新 schema：

```sql
-- 1. 备份数据
CREATE TABLE payments_backup AS SELECT * FROM payments;

-- 2. 执行新的 ALTER 语句
ALTER TABLE payments ADD COLUMN new_field VARCHAR(100);

-- 3. 验证
SELECT * FROM payments LIMIT 5;
```

## 🎉 完成！

配置完成后，您的系统将具备：
- ✓ 完整的支付历史记录
- ✓ 详细的 API 使用统计
- ✓ 实时监控仪表板
- ✓ 收入分析和报表
- ✓ 完全免费

如有问题，请查看 Vercel Dashboard 中的日志或联系支持。
