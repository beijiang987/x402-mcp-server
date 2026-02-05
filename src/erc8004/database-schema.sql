-- ERC-8004 数据库 Schema
-- 用于缓存链上数据，提高查询性能

-- Agents 表
CREATE TABLE IF NOT EXISTS erc8004_agents (
    agent_id VARCHAR(255) PRIMARY KEY,
    owner_address VARCHAR(42) NOT NULL,
    name VARCHAR(255) NOT NULL,
    metadata JSONB NOT NULL,
    created_at BIGINT NOT NULL,
    updated_at BIGINT DEFAULT 0,

    -- 索引字段（从 metadata 提取）
    description TEXT,
    capabilities TEXT[], -- 数组字段
    tags TEXT[], -- 数组字段
    api_endpoint TEXT,

    -- 声誉缓存
    average_rating DECIMAL(3, 2) DEFAULT 0,
    total_feedbacks INTEGER DEFAULT 0,
    total_interactions INTEGER DEFAULT 0,

    -- 时间戳
    db_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    db_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- 索引
    UNIQUE(owner_address)
);

-- Feedbacks 表
CREATE TABLE IF NOT EXISTS erc8004_feedbacks (
    feedback_id VARCHAR(255) PRIMARY KEY,
    agent_id VARCHAR(255) NOT NULL,
    reviewer_address VARCHAR(42) NOT NULL,
    rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NOT NULL,
    timestamp BIGINT NOT NULL,
    tx_hash VARCHAR(66) NOT NULL,
    block_number BIGINT NOT NULL,

    -- 时间戳
    db_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- 外键
    FOREIGN KEY (agent_id) REFERENCES erc8004_agents(agent_id) ON DELETE CASCADE
);

-- 事件日志表（用于追踪已处理的事件）
CREATE TABLE IF NOT EXISTS erc8004_event_logs (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL, -- 'NewRegistration', 'MetadataUpdated', 'NewFeedback'
    contract_address VARCHAR(42) NOT NULL,
    tx_hash VARCHAR(66) NOT NULL,
    block_number BIGINT NOT NULL,
    log_index INTEGER NOT NULL,

    -- 事件数据
    event_data JSONB NOT NULL,

    -- 处理状态
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMP,

    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- 唯一约束（防止重复处理）
    UNIQUE(tx_hash, log_index)
);

-- Agent 搜索统计表
CREATE TABLE IF NOT EXISTS erc8004_search_stats (
    id SERIAL PRIMARY KEY,
    search_keyword TEXT,
    agent_id VARCHAR(255),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- 用于分析热门搜索
    FOREIGN KEY (agent_id) REFERENCES erc8004_agents(agent_id) ON DELETE SET NULL
);

-- 创建索引提升查询性能
CREATE INDEX IF NOT EXISTS idx_agents_owner ON erc8004_agents(owner_address);
CREATE INDEX IF NOT EXISTS idx_agents_name ON erc8004_agents(name);
CREATE INDEX IF NOT EXISTS idx_agents_rating ON erc8004_agents(average_rating DESC);
CREATE INDEX IF NOT EXISTS idx_agents_feedbacks ON erc8004_agents(total_feedbacks DESC);
CREATE INDEX IF NOT EXISTS idx_agents_capabilities ON erc8004_agents USING GIN(capabilities);
CREATE INDEX IF NOT EXISTS idx_agents_tags ON erc8004_agents USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_feedbacks_agent ON erc8004_feedbacks(agent_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_reviewer ON erc8004_feedbacks(reviewer_address);
CREATE INDEX IF NOT EXISTS idx_feedbacks_timestamp ON erc8004_feedbacks(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_feedbacks_rating ON erc8004_feedbacks(rating);

CREATE INDEX IF NOT EXISTS idx_events_block ON erc8004_event_logs(block_number);
CREATE INDEX IF NOT EXISTS idx_events_type ON erc8004_event_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_events_processed ON erc8004_event_logs(processed);

-- 创建触发器自动更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.db_updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_agents_updated_at
    BEFORE UPDATE ON erc8004_agents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 创建视图：带声誉的 Agents
CREATE OR REPLACE VIEW erc8004_agents_with_reputation AS
SELECT
    a.*,
    COALESCE(AVG(f.rating), 0) as live_average_rating,
    COUNT(f.feedback_id) as live_feedback_count
FROM erc8004_agents a
LEFT JOIN erc8004_feedbacks f ON a.agent_id = f.agent_id
GROUP BY a.agent_id;

-- 创建视图：热门 Agents（根据评分和反馈数）
CREATE OR REPLACE VIEW erc8004_trending_agents AS
SELECT
    a.*,
    (a.average_rating / 5.0 * 0.7 + LEAST(a.total_feedbacks / 100.0, 1.0) * 0.3) as trending_score
FROM erc8004_agents a
WHERE a.total_feedbacks > 0
ORDER BY trending_score DESC;

-- 插入示例数据（仅用于测试）
-- INSERT INTO erc8004_agents (agent_id, owner_address, name, metadata, created_at, description, capabilities, tags)
-- VALUES (
--     '1',
--     '0x1234567890123456789012345678901234567890',
--     'DeFi Trading Agent',
--     '{"name":"DeFi Trading Agent","description":"Automated DeFi trading and arbitrage","capabilities":["trading","arbitrage","analytics"],"tags":["defi","trading"]}'::jsonb,
--     1704067200,
--     'Automated DeFi trading and arbitrage',
--     ARRAY['trading','arbitrage','analytics'],
--     ARRAY['defi','trading']
-- );

-- 清理旧数据的函数（可选）
CREATE OR REPLACE FUNCTION cleanup_old_search_stats(days_old INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM erc8004_search_stats
    WHERE timestamp < CURRENT_TIMESTAMP - (days_old || ' days')::INTERVAL;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 使用示例：SELECT cleanup_old_search_stats(30);
