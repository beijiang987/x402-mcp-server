/**
 * 数据填充管理端点
 * 访问: https://x402-mcp-server.vercel.app/api/admin/seed-data?secret=YOUR_SECRET
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import crypto from 'crypto';

// 配置
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 简单的安全检查（生产环境应该使用更强的认证）
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

    // 清空现有数据
    const clearData = req.query.clear === 'true';
    if (clearData) {
      logs.push('🗑️  清空现有数据...');
      await sql.query('TRUNCATE TABLE api_calls RESTART IDENTITY CASCADE');
      await sql.query('TRUNCATE TABLE payments RESTART IDENTITY CASCADE');
      logs.push('  ✓ 清空完成\n');
    }

    // 生成数据
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

      // 生成免费调用
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

      // 生成付费调用
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

        // 插入支付记录
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

        // 插入 API 调用
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

    // 统计
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
