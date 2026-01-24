#!/usr/bin/env node

/**
 * 测试 x402 MCP 服务器
 * 模拟调用数据服务工具
 */

import { DataService } from './dist/data-service.js';

async function testDataService() {
  console.log('🧪 测试 x402 数据服务...\n');

  const dataService = new DataService();

  // 测试 1: 获取代币价格
  console.log('📊 测试 1: 获取 WETH 价格');
  try {
    const price = await dataService.getTokenPrice(
      '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      'ethereum'
    );
    console.log('✅ 成功！');
    console.log('   价格:', price.price, 'USD');
    console.log('   流动性:', price.liquidity.toLocaleString(), 'USD');
    console.log('   数据源:', price.source);
  } catch (error) {
    console.log('❌ 失败:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // 测试 2: 跨链价格聚合
  console.log('🌐 测试 2: USDC 跨链价格');
  try {
    const multiPrice = await dataService.getMultiChainPrice('USDC');
    console.log('✅ 成功！');
    console.log('   代币:', multiPrice.token);

    for (const [chain, data] of Object.entries(multiPrice.prices)) {
      console.log(`   ${chain}: $${data.price} (${data.bestDex})`);
    }

    if (multiPrice.arbitrageOpportunity) {
      const arb = multiPrice.arbitrageOpportunity;
      console.log('\n   🎯 套利机会:');
      console.log(`   ${arb.buyChain} → ${arb.sellChain}`);
      console.log(`   潜在利润: ${arb.potentialProfit.toFixed(2)}%`);
    }
  } catch (error) {
    console.log('❌ 失败:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // 测试 3: 合约安全扫描
  console.log('🔒 测试 3: 合约安全扫描');
  try {
    const safety = await dataService.scanContractSafety(
      '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      'ethereum'
    );
    console.log('✅ 成功！');
    console.log('   风险评分:', safety.riskScore, '/ 100');
    console.log('   安全评分:', 100 - safety.riskScore, '/ 100');
    console.log('   合约验证:', safety.isVerified ? '✅' : '❌');
    console.log('   蜜罐检测:', safety.hasHoneypot ? '⚠️  警告' : '✅ 安全');

    if (safety.warnings.length > 0) {
      console.log('   警告:');
      safety.warnings.forEach(w => console.log('   -', w));
    }
  } catch (error) {
    console.log('❌ 失败:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // 测试 4: 流动池分析
  console.log('💧 测试 4: 流动池分析');
  try {
    const pool = await dataService.getPoolAnalytics(
      '0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640',
      'ethereum'
    );
    console.log('✅ 成功！');
    console.log('   TVL:', pool.tvl.toLocaleString(), 'USD');
    console.log('   24h 交易量:', pool.volume24h.toLocaleString(), 'USD');
    console.log('   APY:', pool.apy.toFixed(2), '%');
    console.log('   无常损失:', pool.impermanentLoss.toFixed(2), '%');
    console.log('   DEX:', pool.dex);
  } catch (error) {
    console.log('❌ 失败:', error.message);
  }

  console.log('\n' + '='.repeat(50));
  console.log('\n✅ 所有测试完成！');
  console.log('\n💡 提示: 当前返回的是模拟数据');
  console.log('   要获取真实数据，需要配置 API Keys');
  console.log('   查看 .env.example 了解详情\n');
}

testDataService().catch(console.error);
