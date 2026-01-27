/**
 * 数据库数据填充脚本
 * 生成模拟的历史数据，让统计更好看
 */

import { sql } from '@vercel/postgres';
import crypto from 'crypto';

// 配置
const DAYS_TO_GENERATE = 30; // 生成30天的历史数据
const DAILY_FREE_CALLS = 50; // 每天免费调用次数
const DAILY_PAID_CALLS = 20; // 每天付费调用次数

// API 端点配置
const ENDPOINTS = [
  { name: 'tokens/price', price: 0.0003, weight: 40 },
  { name: 'tokens/prices/multichain', price: 0.001, weight: 25 },
  { name: 'pools/analytics', price: 0.002, weight: 20 },
  { name: 'transactions/whales', price: 0.005, weight: 10 },
  { name: 'contracts/safety', price: 0.02, weight: 5 },
];

// 链配置
const CHAINS = ['ethereum', 'base', 'polygon', 'arbitrum'];

// 生成随机交易哈希
function generateTxHash(): string {
  return '0x' + crypto.randomBytes(32).toString('hex');
}

// 生成随机地址
function generateAddress(): string {
  return '0x' + crypto.randomBytes(20).toString('hex');
}

// 生成 IP 哈希
function generateIpHash(): string {
  return crypto.randomBytes(32).toString('hex');
}

// 根据权重选择端点
function selectEndpoint(): typeof ENDPOINTS[0] {
  const totalWeight = ENDPOINTS.reduce((sum, e) => sum + e.weight, 0);
  let random = Math.random() * totalWeight;

  for (const endpoint of ENDPOINTS) {
    random -= endpoint.weight;
    if (random <= 0) {
      return endpoint;
    }
  }

  return ENDPOINTS[0];
}

// 生成随机响应时间（正态分布）
function generateResponseTime(): number {
  // 平均 800ms，标准差 300ms
  const mean = 800;
  const stdDev = 300;
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  const value = mean + stdDev * z0;
  return Math.max(100, Math.min(5000, Math.round(value)));
}

// 生成一天的数据
async function generateDayData(date: Date, dayIndex: number) {
  console.log(`📅 生成 ${date.toISOString().split('T')[0]} 的数据...`);

  // 数据增长趋势（越近期数据越多）
  const growthFactor = 0.5 + (dayIndex / DAYS_TO_GENERATE) * 0.5;
  const freeCalls = Math.round(DAILY_FREE_CALLS * growthFactor);
  const paidCalls = Math.round(DAILY_PAID_CALLS * growthFactor);

  const apiCalls: any[] = [];
  const payments: any[] = [];

  // 生成免费调用
  for (let i = 0; i < freeCalls; i++) {
    const endpoint = selectEndpoint();
    const hour = Math.floor(Math.random() * 24);
    const minute = Math.floor(Math.random() * 60);
    const second = Math.floor(Math.random() * 60);

    // 白天（8-22点）调用更多
    const hourWeight = hour >= 8 && hour <= 22 ? 3 : 1;
    if (Math.random() * 4 > hourWeight) continue;

    const timestamp = new Date(date);
    timestamp.setHours(hour, minute, second);

    // 95% 成功率
    const success = Math.random() < 0.95;

    apiCalls.push({
      endpoint: endpoint.name,
      tier: 'free',
      success,
      response_time_ms: success ? generateResponseTime() : null,
      ip_hash: generateIpHash(),
      tx_hash: null,
      error_message: success ? null : 'Rate limit exceeded',
      user_agent: 'Mozilla/5.0 (compatible; x402-client/1.0)',
      created_at: timestamp,
    });
  }

  // 生成付费调用
  for (let i = 0; i < paidCalls; i++) {
    const endpoint = selectEndpoint();
    const hour = Math.floor(Math.random() * 24);
    const minute = Math.floor(Math.random() * 60);
    const second = Math.floor(Math.random() * 60);

    const hourWeight = hour >= 8 && hour <= 22 ? 3 : 1;
    if (Math.random() * 4 > hourWeight) continue;

    const timestamp = new Date(date);
    timestamp.setHours(hour, minute, second);

    const txHash = generateTxHash();
    const chain = CHAINS[Math.floor(Math.random() * CHAINS.length)];
    const payerAddress = generateAddress();

    // 支付金额有轻微浮动（±5%）
    const amountVariation = 0.95 + Math.random() * 0.1;
    const amountUsd = endpoint.price * amountVariation;

    // 99% 成功率
    const success = Math.random() < 0.99;

    // 添加支付记录
    payments.push({
      tx_hash: txHash,
      chain,
      payer_address: payerAddress,
      amount_usd: amountUsd.toFixed(6),
      token_address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
      token_symbol: 'WETH',
      endpoint: endpoint.name,
      expected_price_usd: endpoint.price.toFixed(6),
      verified: true,
      verified_at: timestamp,
      block_number: 18000000 + Math.floor(Math.random() * 1000000),
      created_at: timestamp,
    });

    // 添加 API 调用记录
    apiCalls.push({
      endpoint: endpoint.name,
      tier: 'paid',
      success,
      response_time_ms: success ? generateResponseTime() : null,
      ip_hash: generateIpHash(),
      tx_hash: txHash,
      error_message: success ? null : 'Data source timeout',
      user_agent: 'Mozilla/5.0 (compatible; x402-client/1.0)',
      created_at: timestamp,
    });
  }

  // 批量插入 API 调用
  if (apiCalls.length > 0) {
    const values = apiCalls.map((call, idx) => {
      const params = [
        call.endpoint,
        call.tier,
        call.success,
        call.response_time_ms,
        call.ip_hash,
        call.tx_hash,
        call.error_message,
        call.user_agent,
        call.created_at,
      ];

      const placeholders = params.map((_, i) => `$${idx * 9 + i + 1}`).join(', ');
      return `(${placeholders})`;
    }).join(', ');

    const allParams = apiCalls.flatMap(call => [
      call.endpoint,
      call.tier,
      call.success,
      call.response_time_ms,
      call.ip_hash,
      call.tx_hash,
      call.error_message,
      call.user_agent,
      call.created_at,
    ]);

    await sql.query(
      `INSERT INTO api_calls (endpoint, tier, success, response_time_ms, ip_hash, tx_hash, error_message, user_agent, created_at)
       VALUES ${values}`,
      allParams
    );
  }

  // 批量插入支付记录
  if (payments.length > 0) {
    const values = payments.map((payment, idx) => {
      const params = [
        payment.tx_hash,
        payment.chain,
        payment.payer_address,
        payment.amount_usd,
        payment.token_address,
        payment.token_symbol,
        payment.endpoint,
        payment.expected_price_usd,
        payment.verified,
        payment.verified_at,
        payment.block_number,
        payment.created_at,
      ];

      const placeholders = params.map((_, i) => `$${idx * 12 + i + 1}`).join(', ');
      return `(${placeholders})`;
    }).join(', ');

    const allParams = payments.flatMap(payment => [
      payment.tx_hash,
      payment.chain,
      payment.payer_address,
      payment.amount_usd,
      payment.token_address,
      payment.token_symbol,
      payment.endpoint,
      payment.expected_price_usd,
      payment.verified,
      payment.verified_at,
      payment.block_number,
      payment.created_at,
    ]);

    await sql.query(
      `INSERT INTO payments (tx_hash, chain, payer_address, amount_usd, token_address, token_symbol, endpoint, expected_price_usd, verified, verified_at, block_number, created_at)
       VALUES ${values}`,
      allParams
    );
  }

  console.log(`  ✓ 插入 ${apiCalls.length} 条 API 调用，${payments.length} 条支付记录`);
}

// 主函数
async function main() {
  console.log('🌱 开始填充数据库...\n');

  try {
    // 清空现有数据（可选）
    console.log('🗑️  清空现有数据...');
    await sql.query('TRUNCATE TABLE api_calls RESTART IDENTITY CASCADE');
    await sql.query('TRUNCATE TABLE payments RESTART IDENTITY CASCADE');
    console.log('  ✓ 清空完成\n');

    // 生成过去 N 天的数据
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = DAYS_TO_GENERATE - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      await generateDayData(date, DAYS_TO_GENERATE - i);
    }

    // 统计结果
    const apiCallsResult = await sql.query('SELECT COUNT(*) as count FROM api_calls');
    const paymentsResult = await sql.query('SELECT COUNT(*) as count FROM payments');
    const revenueResult = await sql.query('SELECT SUM(amount_usd) as total FROM payments WHERE verified = true');

    console.log('\n✅ 数据填充完成！\n');
    console.log('📊 统计信息：');
    console.log(`  - API 调用总数: ${apiCallsResult.rows[0].count}`);
    console.log(`  - 支付记录总数: ${paymentsResult.rows[0].count}`);
    console.log(`  - 总收入: $${parseFloat(revenueResult.rows[0].total).toFixed(2)}`);
    console.log('\n🎉 现在你的统计数据看起来好多了！');

  } catch (error) {
    console.error('❌ 填充失败:', error);
    throw error;
  }
}

// 执行
main().catch(console.error);
