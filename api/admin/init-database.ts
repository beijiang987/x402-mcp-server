/**
 * 数据库初始化端点
 * 创建必要的表结构
 * 访问: https://x402-mcp-server.vercel.app/api/admin/init-database?secret=YOUR_SECRET
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 安全检查
  const secret = req.query.secret as string;
  const expectedSecret = process.env.ADMIN_SECRET || 'x402-admin-2024';

  if (secret !== expectedSecret) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Invalid admin secret',
    });
  }

  try {
    const logs: string[] = [];
    logs.push('🔨 开始初始化数据库...\n');

    // 创建支付记录表
    logs.push('📦 创建 payments 表...');
    await sql.query(`
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
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    logs.push('  ✓ payments 表创建成功');

    // 创建索引
    logs.push('🔍 创建索引...');
    await sql.query('CREATE INDEX IF NOT EXISTS idx_tx_hash ON payments(tx_hash)');
    await sql.query('CREATE INDEX IF NOT EXISTS idx_payer_address ON payments(payer_address)');
    await sql.query('CREATE INDEX IF NOT EXISTS idx_created_at ON payments(created_at)');
    await sql.query('CREATE INDEX IF NOT EXISTS idx_endpoint ON payments(endpoint)');
    await sql.query('CREATE INDEX IF NOT EXISTS idx_chain ON payments(chain)');
    logs.push('  ✓ payments 索引创建成功');

    // 创建 API 调用表
    logs.push('📦 创建 api_calls 表...');
    await sql.query(`
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
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    logs.push('  ✓ api_calls 表创建成功');

    // 创建索引
    await sql.query('CREATE INDEX IF NOT EXISTS idx_api_endpoint ON api_calls(endpoint)');
    await sql.query('CREATE INDEX IF NOT EXISTS idx_api_tier ON api_calls(tier)');
    await sql.query('CREATE INDEX IF NOT EXISTS idx_api_created_at ON api_calls(created_at)');
    await sql.query('CREATE INDEX IF NOT EXISTS idx_api_success ON api_calls(success)');
    logs.push('  ✓ api_calls 索引创建成功');

    // 检查表状态
    const paymentsCount = await sql.query('SELECT COUNT(*) as count FROM payments');
    const apiCallsCount = await sql.query('SELECT COUNT(*) as count FROM api_calls');

    logs.push('\n✅ 数据库初始化完成！\n');
    logs.push('📊 当前状态：');
    logs.push(`  - payments 表: ${paymentsCount.rows[0].count} 条记录`);
    logs.push(`  - api_calls 表: ${apiCallsCount.rows[0].count} 条记录`);

    return res.status(200).json({
      success: true,
      message: '数据库初始化成功',
      stats: {
        payments: paymentsCount.rows[0].count,
        api_calls: apiCallsCount.rows[0].count,
      },
      logs: logs.join('\n'),
    });

  } catch (error: any) {
    console.error('初始化失败:', error);
    return res.status(500).json({
      success: false,
      error: '数据库初始化失败',
      message: error.message,
    });
  }
}
