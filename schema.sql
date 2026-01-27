-- x402 AI Agent Data Service - Postgres Schema
-- 支付历史记录和 API 使用统计

-- ============================================
-- 1. 支付记录表
-- ============================================
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  tx_hash VARCHAR(66) UNIQUE NOT NULL,
  chain VARCHAR(20) NOT NULL,
  payer_address VARCHAR(42) NOT NULL,
  amount_usd DECIMAL(10, 6) NOT NULL,
  token_address VARCHAR(42) NOT NULL,
  token_symbol VARCHAR(10) NOT NULL,
  endpoint VARCHAR(100) NOT NULL,
  expected_price_usd DECIMAL(10, 6) NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  verified_at TIMESTAMP,
  block_number BIGINT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  INDEX idx_tx_hash (tx_hash),
  INDEX idx_payer_address (payer_address),
  INDEX idx_created_at (created_at),
  INDEX idx_endpoint (endpoint),
  INDEX idx_chain (chain)
);

COMMENT ON TABLE payments IS '支付记录表 - 存储所有 x402 支付交易';
COMMENT ON COLUMN payments.tx_hash IS '区块链交易哈希';
COMMENT ON COLUMN payments.chain IS '链名称: ethereum, base 等';
COMMENT ON COLUMN payments.payer_address IS '支付者钱包地址';
COMMENT ON COLUMN payments.amount_usd IS '实际支付的 USD 金额';
COMMENT ON COLUMN payments.endpoint IS '调用的 API 端点';
COMMENT ON COLUMN payments.verified IS '是否已验证';

-- ============================================
-- 2. API 调用统计表
-- ============================================
CREATE TABLE IF NOT EXISTS api_calls (
  id SERIAL PRIMARY KEY,
  endpoint VARCHAR(100) NOT NULL,
  tier VARCHAR(10) NOT NULL,
  success BOOLEAN NOT NULL,
  response_time_ms INTEGER,
  ip_hash VARCHAR(64),
  tx_hash VARCHAR(66),
  error_message TEXT,
  user_agent TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  INDEX idx_endpoint (endpoint),
  INDEX idx_tier (tier),
  INDEX idx_created_at (created_at),
  INDEX idx_success (success),
  INDEX idx_ip_hash (ip_hash),
  INDEX idx_tx_hash (tx_hash)
);

COMMENT ON TABLE api_calls IS 'API 调用统计表 - 记录每次 API 调用';
COMMENT ON COLUMN api_calls.tier IS '用户层级: free 或 paid';
COMMENT ON COLUMN api_calls.success IS '调用是否成功';
COMMENT ON COLUMN api_calls.response_time_ms IS '响应时间（毫秒）';
COMMENT ON COLUMN api_calls.ip_hash IS '用户 IP 哈希（隐私保护）';

-- ============================================
-- 3. 速率限制事件表
-- ============================================
CREATE TABLE IF NOT EXISTS rate_limit_events (
  id SERIAL PRIMARY KEY,
  identifier VARCHAR(100) NOT NULL,
  tier VARCHAR(10) NOT NULL,
  endpoint VARCHAR(100) NOT NULL,
  blocked BOOLEAN NOT NULL,
  requests_count INTEGER NOT NULL,
  reset_time TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  INDEX idx_identifier (identifier),
  INDEX idx_created_at (created_at),
  INDEX idx_blocked (blocked)
);

COMMENT ON TABLE rate_limit_events IS '速率限制事件表 - 记录限流情况';
COMMENT ON COLUMN rate_limit_events.identifier IS 'IP 地址或交易哈希';
COMMENT ON COLUMN rate_limit_events.blocked IS '是否被限流';

-- ============================================
-- 4. 数据源调用统计表
-- ============================================
CREATE TABLE IF NOT EXISTS data_source_calls (
  id SERIAL PRIMARY KEY,
  source VARCHAR(50) NOT NULL,
  operation VARCHAR(100) NOT NULL,
  success BOOLEAN NOT NULL,
  duration_ms INTEGER NOT NULL,
  cache_hit BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  INDEX idx_source (source),
  INDEX idx_created_at (created_at),
  INDEX idx_success (success)
);

COMMENT ON TABLE data_source_calls IS '数据源调用统计 - 监控外部 API 性能';
COMMENT ON COLUMN data_source_calls.source IS '数据源名称: CoinGecko, GoPlus 等';
COMMENT ON COLUMN data_source_calls.cache_hit IS '是否命中缓存';

-- ============================================
-- 5. 视图：每日收入统计
-- ============================================
CREATE OR REPLACE VIEW daily_revenue AS
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_payments,
  SUM(amount_usd) as total_revenue_usd,
  COUNT(DISTINCT payer_address) as unique_payers,
  AVG(amount_usd) as avg_payment_usd
FROM payments
WHERE verified = true
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- ============================================
-- 6. 视图：端点使用统计
-- ============================================
CREATE OR REPLACE VIEW endpoint_stats AS
SELECT
  endpoint,
  COUNT(*) as total_calls,
  SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful_calls,
  SUM(CASE WHEN tier = 'paid' THEN 1 ELSE 0 END) as paid_calls,
  SUM(CASE WHEN tier = 'free' THEN 1 ELSE 0 END) as free_calls,
  AVG(response_time_ms) as avg_response_ms,
  COUNT(DISTINCT ip_hash) as unique_users
FROM api_calls
GROUP BY endpoint
ORDER BY total_calls DESC;

-- ============================================
-- 7. 视图：实时统计（最近 24 小时）
-- ============================================
CREATE OR REPLACE VIEW realtime_stats AS
SELECT
  COUNT(*) as total_calls_24h,
  SUM(CASE WHEN tier = 'paid' THEN 1 ELSE 0 END) as paid_calls_24h,
  SUM(CASE WHEN tier = 'free' THEN 1 ELSE 0 END) as free_calls_24h,
  COUNT(DISTINCT ip_hash) as unique_ips_24h,
  AVG(response_time_ms) as avg_response_time_24h,
  SUM(CASE WHEN success THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as success_rate_24h
FROM api_calls
WHERE created_at > NOW() - INTERVAL '24 hours';

-- ============================================
-- 8. 视图：支付者排行榜
-- ============================================
CREATE OR REPLACE VIEW top_payers AS
SELECT
  payer_address,
  COUNT(*) as total_payments,
  SUM(amount_usd) as total_spent_usd,
  MIN(created_at) as first_payment,
  MAX(created_at) as last_payment
FROM payments
WHERE verified = true
GROUP BY payer_address
ORDER BY total_spent_usd DESC
LIMIT 100;

-- ============================================
-- 9. 函数：获取每小时请求量（最近 24 小时）
-- ============================================
CREATE OR REPLACE FUNCTION get_hourly_requests()
RETURNS TABLE(hour TIMESTAMP, request_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE_TRUNC('hour', created_at) as hour,
    COUNT(*) as request_count
  FROM api_calls
  WHERE created_at > NOW() - INTERVAL '24 hours'
  GROUP BY DATE_TRUNC('hour', created_at)
  ORDER BY hour DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 10. 示例数据（可选，用于测试）
-- ============================================
-- INSERT INTO payments (tx_hash, chain, payer_address, amount_usd, token_address, token_symbol, endpoint, expected_price_usd, verified)
-- VALUES
--   ('0xabc123...', 'base', '0x1234...', 0.0003, '0x833589...', 'USDC', '/api/x402/tokens/price', 0.0003, true),
--   ('0xdef456...', 'ethereum', '0x5678...', 0.02, '0xA0b869...', 'USDC', '/api/x402/contracts/safety', 0.02, true);

-- INSERT INTO api_calls (endpoint, tier, success, response_time_ms, ip_hash)
-- VALUES
--   ('/api/x402/tokens/price', 'free', true, 1250, 'hash123'),
--   ('/api/x402/tokens/price', 'paid', true, 150, 'hash456');
