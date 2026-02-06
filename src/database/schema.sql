-- ERC-8004 数据库 Schema
--
-- 用途：
-- 1. 缓存链上数据（减少 Subgraph 查询）
-- 2. 预计算声誉评分（加速 API 响应）
-- 3. 记录匹配日志（分析和优化）
-- 4. 存储用户会话（未来功能）

-- ============================================
-- 1. Agents 表（缓存链上数据）
-- ============================================

CREATE TABLE IF NOT EXISTS agents (
  -- 主键
  id SERIAL PRIMARY KEY,

  -- 链上数据
  agent_id VARCHAR(255) NOT NULL, -- ERC-8004 agent ID
  owner_address VARCHAR(66) NOT NULL, -- 0x...
  agent_uri TEXT NOT NULL, -- IPFS/HTTP/data URI
  network VARCHAR(50) NOT NULL DEFAULT 'sepolia', -- sepolia, mainnet, base

  -- 元数据（解析后）
  name VARCHAR(255),
  description TEXT,
  image TEXT,
  domains TEXT[], -- 领域数组
  skills TEXT[], -- 技能数组
  capabilities TEXT[], -- 能力数组
  services JSONB, -- 服务端点数组
  x402_support BOOLEAN DEFAULT false,

  -- 时间戳
  created_at TIMESTAMP NOT NULL, -- 链上创建时间
  indexed_at TIMESTAMP DEFAULT NOW(), -- 索引时间
  updated_at TIMESTAMP DEFAULT NOW(), -- 更新时间

  -- 索引
  UNIQUE(agent_id, network)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_agents_owner ON agents(owner_address);
CREATE INDEX IF NOT EXISTS idx_agents_network ON agents(network);
CREATE INDEX IF NOT EXISTS idx_agents_domains ON agents USING GIN (domains);
CREATE INDEX IF NOT EXISTS idx_agents_skills ON agents USING GIN (skills);
CREATE INDEX IF NOT EXISTS idx_agents_capabilities ON agents USING GIN (capabilities);
CREATE INDEX IF NOT EXISTS idx_agents_created_at ON agents(created_at DESC);

-- ============================================
-- 2. Feedbacks 表（缓存链上反馈）
-- ============================================

CREATE TABLE IF NOT EXISTS feedbacks (
  -- 主键
  id SERIAL PRIMARY KEY,

  -- 链上数据
  feedback_id VARCHAR(255) NOT NULL, -- Subgraph feedback ID
  agent_id VARCHAR(255) NOT NULL,
  client_address VARCHAR(66) NOT NULL, -- 评价者地址
  network VARCHAR(50) NOT NULL DEFAULT 'sepolia',

  -- 评分数据
  value BIGINT NOT NULL, -- int128 原始值
  value_decimals SMALLINT NOT NULL, -- 0-18
  numeric_score DECIMAL(10, 4), -- 转换后的数值评分

  -- 标签（分维度评分）
  tag1 VARCHAR(100), -- 如 "accuracy"
  tag2 VARCHAR(100), -- 如 "reliability"

  -- 元数据
  endpoint TEXT, -- 评价的端点
  data_uri TEXT, -- 详情 URI
  revoked BOOLEAN DEFAULT false, -- 是否已撤销

  -- 时间戳
  created_at TIMESTAMP NOT NULL, -- 链上创建时间
  indexed_at TIMESTAMP DEFAULT NOW(), -- 索引时间

  -- 索引
  UNIQUE(feedback_id, network)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_feedbacks_agent_id ON feedbacks(agent_id, network);
CREATE INDEX IF NOT EXISTS idx_feedbacks_client ON feedbacks(client_address);
CREATE INDEX IF NOT EXISTS idx_feedbacks_created_at ON feedbacks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedbacks_tag1 ON feedbacks(tag1);
CREATE INDEX IF NOT EXISTS idx_feedbacks_tag2 ON feedbacks(tag2);

-- ============================================
-- 3. Reputation Scores 表（预计算评分）
-- ============================================

CREATE TABLE IF NOT EXISTS reputation_scores (
  -- 主键
  id SERIAL PRIMARY KEY,

  -- 关联
  agent_id VARCHAR(255) NOT NULL,
  network VARCHAR(50) NOT NULL DEFAULT 'sepolia',

  -- 总体评分
  overall_score DECIMAL(5, 2) NOT NULL, -- 0-100

  -- 四维度评分
  accuracy_score DECIMAL(5, 2), -- 0-100
  reliability_score DECIMAL(5, 2),
  speed_score DECIMAL(5, 2),
  value_score DECIMAL(5, 2),

  -- 加权评分（时间衰减后）
  weighted_score DECIMAL(5, 2),

  -- 统计数据
  total_feedbacks INTEGER DEFAULT 0,
  positive_feedbacks INTEGER DEFAULT 0,
  negative_feedbacks INTEGER DEFAULT 0,
  unique_clients INTEGER DEFAULT 0,

  -- Sybil 风险
  sybil_risk DECIMAL(5, 4) DEFAULT 0, -- 0-1

  -- 时间统计
  first_feedback_at TIMESTAMP,
  last_feedback_at TIMESTAMP,

  -- 更新时间
  calculated_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- 索引
  UNIQUE(agent_id, network)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_reputation_overall ON reputation_scores(overall_score DESC);
CREATE INDEX IF NOT EXISTS idx_reputation_accuracy ON reputation_scores(accuracy_score DESC);
CREATE INDEX IF NOT EXISTS idx_reputation_network ON reputation_scores(network);
CREATE INDEX IF NOT EXISTS idx_reputation_updated_at ON reputation_scores(updated_at DESC);

-- ============================================
-- 4. Match Logs 表（匹配日志）
-- ============================================

CREATE TABLE IF NOT EXISTS match_logs (
  -- 主键
  id SERIAL PRIMARY KEY,

  -- 请求信息
  task_description TEXT NOT NULL,
  task_category VARCHAR(100),
  task_intent TEXT,

  -- 任务理解结果
  extracted_domains TEXT[],
  extracted_skills TEXT[],
  extracted_capabilities TEXT[],
  task_complexity SMALLINT,

  -- 匹配结果
  matched_agent_ids TEXT[], -- 返回的 Agent IDs
  match_count INTEGER,

  -- 性能指标
  processing_time_ms INTEGER,

  -- 用户信息（可选）
  user_ip VARCHAR(45),
  user_agent TEXT,

  -- 时间戳
  created_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_match_logs_created_at ON match_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_match_logs_category ON match_logs(task_category);

-- ============================================
-- 5. Sync Status 表（同步状态追踪）
-- ============================================

CREATE TABLE IF NOT EXISTS sync_status (
  -- 主键
  id SERIAL PRIMARY KEY,

  -- 同步目标
  entity_type VARCHAR(50) NOT NULL, -- agents, feedbacks, validations
  network VARCHAR(50) NOT NULL,

  -- 同步状态
  last_synced_block BIGINT,
  last_synced_at TIMESTAMP,
  last_error TEXT,

  -- 索引
  UNIQUE(entity_type, network)
);

-- ============================================
-- 视图：Agent 统计摘要
-- ============================================

CREATE OR REPLACE VIEW agent_summary AS
SELECT
  a.agent_id,
  a.network,
  a.name,
  a.owner_address,
  a.domains,
  a.skills,
  a.capabilities,
  a.x402_support,
  a.created_at,
  r.overall_score,
  r.accuracy_score,
  r.reliability_score,
  r.speed_score,
  r.value_score,
  r.total_feedbacks,
  r.sybil_risk,
  r.last_feedback_at
FROM agents a
LEFT JOIN reputation_scores r ON a.agent_id = r.agent_id AND a.network = r.network
ORDER BY r.overall_score DESC NULLS LAST;

-- ============================================
-- 触发器：自动更新 updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_agents_updated_at
  BEFORE UPDATE ON agents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reputation_scores_updated_at
  BEFORE UPDATE ON reputation_scores
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 初始化同步状态
-- ============================================

INSERT INTO sync_status (entity_type, network)
VALUES
  ('agents', 'sepolia'),
  ('feedbacks', 'sepolia'),
  ('agents', 'mainnet'),
  ('feedbacks', 'mainnet')
ON CONFLICT (entity_type, network) DO NOTHING;
