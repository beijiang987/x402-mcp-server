/**
 * Admin API - Consolidated Endpoint
 *
 * Routes:
 *   /api/admin?action=stats&type=basic        - Basic dashboard statistics (default)
 *   /api/admin?action=stats&type=full         - Full historical statistics
 *   /api/admin?action=stats&type=health       - Health check
 *   /api/admin?action=init-database&secret=X  - Initialize database tables
 *   /api/admin?action=seed-data&secret=X      - Seed sample data
 *
 * Note: For backwards compatibility, /api/admin/stats still works via vercel.json rewrites
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../src/database.js';
import { sql } from '@vercel/postgres';
import crypto from 'crypto';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const action = (req.query.action as string) || 'stats';

  try {
    if (action === 'init-database') {
      return handleInitDatabase(req, res);
    } else if (action === 'seed-data') {
      return handleSeedData(req, res);
    } else if (action === 'stats') {
      return handleStats(req, res);
    } else {
      return res.status(400).json({ error: 'Invalid action', validActions: ['stats', 'init-database', 'seed-data'] });
    }
  } catch (error: any) {
    console.error('Admin API error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}

// ==================== STATS ====================

async function handleStats(req: VercelRequest, res: VercelResponse) {
  const type = (req.query.type as string) || 'basic';

  if (type === 'health') {
    return handleHealth(req, res);
  } else if (type === 'full') {
    return handleFullStats(req, res);
  } else {
    return handleBasicStats(req, res);
  }
}

async function handleHealth(req: VercelRequest, res: VercelResponse) {
  const envStatus = {
    KV_URL: process.env.KV_REST_API_URL ? '✓ configured' : '✗ missing',
    KV_TOKEN: process.env.KV_REST_API_TOKEN ? '✓ configured' : '✗ missing',
    PAYMENT_ADDRESS_BASE: process.env.X402_PAYMENT_ADDRESS_BASE ? '✓ configured' : '> using default',
    PAYMENT_ADDRESS: process.env.X402_RECEIVE_ADDRESS ? '✓ configured' : '> using default',
    BASE_SEPOLIA_RPC: process.env.BASE_SEPOLIA_RPC_URL ? '✓ configured' : '✗ missing',
    RPC_URL: process.env.RPC_URL ? '✓ configured' : '✗ missing',
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? '✓ configured' : '✗ missing',
  };

  return res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: envStatus,
    version: '1.1.0',
  });
}

async function handleFullStats(req: VercelRequest, res: VercelResponse) {
  const payments = await sql`SELECT COUNT(*) as total, SUM(amount_usd) as total_usd FROM payments WHERE verified = true`;
  const apiCalls = await sql`SELECT COUNT(*) as total, SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful FROM api_calls`;
  const recentPayments = await sql`SELECT tx_hash, chain, amount_usd, endpoint, created_at FROM payments WHERE verified = true ORDER BY created_at DESC LIMIT 20`;
  const endpointStats = await sql`SELECT endpoint, COUNT(*) as calls, AVG(response_time_ms) as avg_time FROM api_calls GROUP BY endpoint ORDER BY calls DESC`;

  return res.status(200).json({
    type: 'full',
    payments: {
      total: parseInt(payments.rows[0]?.total || '0'),
      totalUsd: parseFloat(payments.rows[0]?.total_usd || '0'),
      recent: recentPayments.rows,
    },
    apiCalls: {
      total: parseInt(apiCalls.rows[0]?.total || '0'),
      successful: parseInt(apiCalls.rows[0]?.successful || '0'),
    },
    endpoints: endpointStats.rows,
    generatedAt: new Date().toISOString(),
  });
}

async function handleBasicStats(req: VercelRequest, res: VercelResponse) {
  const stats24h = await sql`
    SELECT
      COUNT(*) as total_calls_24h,
      SUM(CASE WHEN tier = 'paid' THEN 1 ELSE 0 END) as paid_calls_24h,
      SUM(CASE WHEN tier = 'free' THEN 1 ELSE 0 END) as free_calls_24h,
      AVG(response_time_ms) as avg_response_time_24h,
      SUM(CASE WHEN success THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0) as success_rate_24h
    FROM api_calls
    WHERE created_at > NOW() - INTERVAL '24 hours'
  `;

  const totalPayments = await sql`SELECT COUNT(*) as total, SUM(amount_usd) as total_usd FROM payments WHERE verified = true`;

  return res.status(200).json({
    type: 'basic',
    last24h: {
      totalCalls: parseInt(stats24h.rows[0]?.total_calls_24h || '0'),
      paidCalls: parseInt(stats24h.rows[0]?.paid_calls_24h || '0'),
      freeCalls: parseInt(stats24h.rows[0]?.free_calls_24h || '0'),
      avgResponseTime: parseFloat(stats24h.rows[0]?.avg_response_time_24h || '0'),
      successRate: parseFloat(stats24h.rows[0]?.success_rate_24h || '0'),
    },
    payments: {
      total: parseInt(totalPayments.rows[0]?.total || '0'),
      totalUsd: parseFloat(totalPayments.rows[0]?.total_usd || '0'),
    },
    generatedAt: new Date().toISOString(),
  });
}

// ==================== INIT DATABASE ====================

async function handleInitDatabase(req: VercelRequest, res: VercelResponse) {
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

    logs.push('🔍 创建索引...');
    await sql.query('CREATE INDEX IF NOT EXISTS idx_tx_hash ON payments(tx_hash)');
    await sql.query('CREATE INDEX IF NOT EXISTS idx_payer_address ON payments(payer_address)');
    await sql.query('CREATE INDEX IF NOT EXISTS idx_created_at ON payments(created_at)');
    await sql.query('CREATE INDEX IF NOT EXISTS idx_endpoint ON payments(endpoint)');
    await sql.query('CREATE INDEX IF NOT EXISTS idx_chain ON payments(chain)');
    logs.push('  ✓ payments 索引创建成功');

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

    await sql.query('CREATE INDEX IF NOT EXISTS idx_api_endpoint ON api_calls(endpoint)');
    await sql.query('CREATE INDEX IF NOT EXISTS idx_api_tier ON api_calls(tier)');
    await sql.query('CREATE INDEX IF NOT EXISTS idx_api_created_at ON api_calls(created_at)');
    await sql.query('CREATE INDEX IF NOT EXISTS idx_api_success ON api_calls(success)');
    logs.push('  ✓ api_calls 索引创建成功');

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

// ==================== SEED DATA ====================

const DAYS_TO_GENERATE = 30;
const DAILY_FREE_CALLS = 50;
const DAILY_PAID_CALLS = 20;

const ENDPOINTS = [
  { name: 'tokens/price', price: 0.0003, weight: 40 },
  { name: 'tokens/prices/multichain', price: 0.001, weight: 25 },
  { name: 'pools/analytics', price: 0.002, weight: 20 },
  { name: 'transactions/whales', price: 0.005, weight: 10 },
  { name: 'contracts/safety', price: 0.02, weight: 5 },
];

const CHAINS = ['ethereum', 'base', 'polygon', 'arbitrum'];

function generateTxHash(): string {
  return '0x' + crypto.randomBytes(32).toString('hex');
}

function generateAddress(): string {
  return '0x' + crypto.randomBytes(20).toString('hex');
}

function generateIpHash(): string {
  return crypto.randomBytes(32).toString('hex');
}

function selectEndpoint(): typeof ENDPOINTS[0] {
  const totalWeight = ENDPOINTS.reduce((sum, e) => sum + e.weight, 0);
  let random = Math.random() * totalWeight;
  for (const endpoint of ENDPOINTS) {
    random -= endpoint.weight;
    if (random <= 0) return endpoint;
  }
  return ENDPOINTS[0];
}

function generateResponseTime(): number {
  const mean = 800;
  const stdDev = 300;
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  const value = mean + stdDev * z0;
  return Math.max(100, Math.min(5000, Math.round(value)));
}

async function handleSeedData(req: VercelRequest, res: VercelResponse) {
  const secret = req.query.secret as string;
  const expectedSecret = process.env.ADMIN_SECRET || 'x402-admin-2024';

  if (secret !== expectedSecret) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Invalid admin secret. Use ?secret=YOUR_SECRET',
    });
  }

  try {
    const logs: string[] = [];
    logs.push('🌱 开始填充数据...\n');

    const clearData = req.query.clear === 'true';
    if (clearData) {
      logs.push('🗑️  清空现有数据...');
      await sql.query('TRUNCATE TABLE api_calls RESTART IDENTITY CASCADE');
      await sql.query('TRUNCATE TABLE payments RESTART IDENTITY CASCADE');
      logs.push('  ✓ 清空完成\n');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let totalApiCalls = 0;
    let totalPayments = 0;

    for (let i = DAYS_TO_GENERATE - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dayIndex = DAYS_TO_GENERATE - i;

      const growthFactor = 0.5 + (dayIndex / DAYS_TO_GENERATE) * 0.5;
      const freeCalls = Math.round(DAILY_FREE_CALLS * growthFactor);
      const paidCalls = Math.round(DAILY_PAID_CALLS * growthFactor);

      for (let j = 0; j < freeCalls; j++) {
        const endpoint = selectEndpoint();
        const hour = Math.floor(Math.random() * 24);
        const hourWeight = hour >= 8 && hour <= 22 ? 3 : 1;
        if (Math.random() * 4 > hourWeight) continue;

        const timestamp = new Date(date);
        timestamp.setHours(hour, Math.floor(Math.random() * 60), Math.floor(Math.random() * 60));
        const success = Math.random() < 0.95;

        await sql.query(
          `INSERT INTO api_calls (endpoint, tier, success, response_time_ms, ip_hash, error_message, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            endpoint.name,
            'free',
            success,
            success ? generateResponseTime() : null,
            generateIpHash(),
            success ? null : 'Rate limit exceeded',
            timestamp,
          ]
        );
        totalApiCalls++;
      }

      for (let j = 0; j < paidCalls; j++) {
        const endpoint = selectEndpoint();
        const hour = Math.floor(Math.random() * 24);
        const hourWeight = hour >= 8 && hour <= 22 ? 3 : 1;
        if (Math.random() * 4 > hourWeight) continue;

        const timestamp = new Date(date);
        timestamp.setHours(hour, Math.floor(Math.random() * 60), Math.floor(Math.random() * 60));
        const txHash = generateTxHash();
        const chain = CHAINS[Math.floor(Math.random() * CHAINS.length)];
        const amountUsd = endpoint.price * (0.95 + Math.random() * 0.1);
        const success = Math.random() < 0.99;

        await sql.query(
          `INSERT INTO payments (tx_hash, chain, payer_address, amount_usd, token_address, token_symbol, endpoint, expected_price_usd, verified, verified_at, block_number, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            txHash,
            chain,
            generateAddress(),
            amountUsd.toFixed(6),
            '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
            'WETH',
            endpoint.name,
            endpoint.price.toFixed(6),
            true,
            timestamp,
            18000000 + Math.floor(Math.random() * 1000000),
            timestamp,
          ]
        );
        totalPayments++;

        await sql.query(
          `INSERT INTO api_calls (endpoint, tier, success, response_time_ms, ip_hash, tx_hash, error_message, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            endpoint.name,
            'paid',
            success,
            success ? generateResponseTime() : null,
            generateIpHash(),
            txHash,
            success ? null : 'Data source timeout',
            timestamp,
          ]
        );
        totalApiCalls++;
      }

      logs.push(`📅 ${date.toISOString().split('T')[0]}: +${freeCalls} 免费, +${paidCalls} 付费`);
    }

    const revenueResult = await sql.query('SELECT SUM(amount_usd) as total FROM payments WHERE verified = true');
    const revenue = parseFloat(revenueResult.rows[0].total || 0);

    logs.push('\n✅ 数据填充完成！\n');
    logs.push('📊 统计信息：');
    logs.push(`  - API 调用总数: ${totalApiCalls}`);
    logs.push(`  - 支付记录总数: ${totalPayments}`);
    logs.push(`  - 总收入: $${revenue.toFixed(2)}`);

    return res.status(200).json({
      success: true,
      message: '数据填充成功',
      stats: {
        api_calls: totalApiCalls,
        payments: totalPayments,
        revenue: revenue.toFixed(2),
        days: DAYS_TO_GENERATE,
      },
      logs: logs.join('\n'),
    });

  } catch (error: any) {
    console.error('填充失败:', error);
    return res.status(500).json({
      success: false,
      error: '数据填充失败',
      message: error.message,
    });
  }
}
