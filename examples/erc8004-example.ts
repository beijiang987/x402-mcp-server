/**
 * ERC-8004 + x402 集成示例
 *
 * 展示如何使用 ERC-8004 服务进行 Agent 注册、搜索、评分等操作
 */

import { ERC8004Service } from '../src/erc8004/erc8004-service.js';
import { ERC8004EventListener } from '../src/erc8004/event-listener.js';

// 环境配置
const PRIVATE_KEY = process.env.X402_WALLET_PRIVATE_KEY!;
const RPC_URL = process.env.X402_RPC_URL || 'https://sepolia.infura.io/v3/YOUR_KEY';
const NETWORK = 'sepolia' as const;

async function main() {
  console.log('🚀 ERC-8004 + x402 集成示例\n');

  // ============================================
  // 示例 1: 初始化服务
  // ============================================
  console.log('📦 步骤 1: 初始化 ERC-8004 服务');
  const service = new ERC8004Service(PRIVATE_KEY, NETWORK, RPC_URL);
  console.log('✅ 服务初始化完成\n');

  // ============================================
  // 示例 2: 注册新 Agent
  // ============================================
  console.log('📝 步骤 2: 注册新 AI Agent');

  try {
    const { agentId, txHash } = await service.registerAgent(
      'DeFi Trading Assistant',
      {
        name: 'DeFi Trading Assistant',
        description: '专业的 DeFi 交易助手，提供实时市场分析和自动化交易策略',
        capabilities: [
          'market-analysis',
          'price-prediction',
          'automated-trading',
          'risk-management',
        ],
        apiEndpoint: 'https://api.defi-assistant.example.com',
        pricing: {
          model: 'per-call',
          amount: '0.0001',
          currency: 'ETH',
        },
        tags: ['defi', 'trading', 'automation', 'analytics'],
        version: '1.0.0',
        contacts: {
          website: 'https://defi-assistant.example.com',
          github: 'https://github.com/example/defi-assistant',
          twitter: '@defi_assistant',
        },
      }
    );

    console.log(`✅ Agent 注册成功！`);
    console.log(`   Agent ID: ${agentId}`);
    console.log(`   交易哈希: ${txHash}`);
    console.log(`   查看交易: https://sepolia.etherscan.io/tx/${txHash}\n`);

    // 等待一段时间让交易确认
    console.log('⏳ 等待交易确认...\n');
    await new Promise((resolve) => setTimeout(resolve, 30000));

    // ============================================
    // 示例 3: 获取 Agent 信息
    // ============================================
    console.log('🔍 步骤 3: 获取 Agent 详细信息');

    const agent = await service.getAgent(agentId);
    console.log('Agent 信息:');
    console.log(JSON.stringify(agent, null, 2));
    console.log();

    // ============================================
    // 示例 4: 提交反馈
    // ============================================
    console.log('⭐ 步骤 4: 提交 Agent 反馈');

    const { feedbackId, txHash: feedbackTxHash } = await service.submitFeedback(
      agentId,
      5,
      '非常棒的交易助手！市场分析准确，交易策略收益稳定。'
    );

    console.log(`✅ 反馈提交成功！`);
    console.log(`   Feedback ID: ${feedbackId}`);
    console.log(`   交易哈希: ${feedbackTxHash}\n`);

    // ============================================
    // 示例 5: 搜索 Agents
    // ============================================
    console.log('🔎 步骤 5: 搜索 AI Agents');

    const searchResults = await service.searchAgents({
      keyword: 'trading',
      tags: ['defi'],
      minRating: 4.0,
      first: 10,
    });

    console.log(`找到 ${searchResults.length} 个符合条件的 Agents:`);
    searchResults.forEach((agent, index) => {
      console.log(`\n${index + 1}. ${agent.name}`);
      console.log(`   ID: ${agent.agentId}`);
      console.log(`   评分: ${agent.reputation?.averageRating.toFixed(2) || 'N/A'}/5.0`);
      console.log(`   反馈数: ${agent.reputation?.totalFeedbacks || 0}`);
      console.log(`   能力: ${agent.metadata.capabilities.join(', ')}`);
    });
    console.log();

    // ============================================
    // 示例 6: 获取热门 Agents
    // ============================================
    console.log('🔥 步骤 6: 获取热门 Agents');

    const trendingAgents = await service.getTrendingAgents(5);

    console.log(`热门 Agents Top 5:`);
    trendingAgents.forEach((agent, index) => {
      console.log(`\n${index + 1}. ${agent.name}`);
      console.log(`   评分: ${agent.reputation?.averageRating.toFixed(2) || 'N/A'}/5.0`);
      console.log(`   人气指数: ${(agent as any).trendingScore?.toFixed(3) || 'N/A'}`);
    });
    console.log();

    // ============================================
    // 示例 7: 获取平台统计
    // ============================================
    console.log('📊 步骤 7: 获取平台统计数据');

    const stats = await service.getStats();

    console.log(`平台统计:`);
    console.log(`   总 Agents: ${stats.totalAgents}`);
    console.log(`   总反馈数: ${stats.totalFeedbacks}`);
    console.log(`   平均评分: ${stats.averageRating.toFixed(2)}/5.0\n`);

    // ============================================
    // 示例 8: 监听事件（可选）
    // ============================================
    console.log('👂 步骤 8: 设置事件监听器（持续运行）');

    const listener = new ERC8004EventListener(NETWORK, RPC_URL);

    listener.setHandlers({
      onNewRegistration: async (event) => {
        console.log('\n🆕 检测到新 Agent 注册:');
        console.log(`   Agent ID: ${event.agentId}`);
        console.log(`   所有者: ${event.owner}`);
        console.log(`   名称: ${event.name}`);
        console.log(`   区块: ${event.blockNumber}`);
      },

      onMetadataUpdated: async (event) => {
        console.log('\n🔄 检测到元数据更新:');
        console.log(`   Agent ID: ${event.agentId}`);
      },

      onNewFeedback: async (event) => {
        console.log('\n⭐ 检测到新反馈:');
        console.log(`   Agent ID: ${event.agentId}`);
        console.log(`   评分: ${event.rating}/5`);
        console.log(`   评论者: ${event.reviewer}`);
      },
    });

    await listener.startListening();

    console.log('✅ 事件监听器已启动，监听链上事件...');
    console.log('   按 Ctrl+C 停止\n');

    // 保持运行
    await new Promise(() => {});
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

// ============================================
// 示例 9: 高级用法 - 批量操作
// ============================================
async function batchOperationsExample() {
  console.log('\n📦 高级示例: 批量操作\n');

  const service = new ERC8004Service(PRIVATE_KEY, NETWORK, RPC_URL);

  // 批量注册多个 Agents
  const agentsToRegister = [
    {
      name: 'NFT Price Oracle',
      metadata: {
        name: 'NFT Price Oracle',
        description: 'NFT 价格预测和估值工具',
        capabilities: ['price-prediction', 'market-analysis'],
        tags: ['nft', 'pricing', 'analytics'],
      },
    },
    {
      name: 'Gas Fee Optimizer',
      metadata: {
        name: 'Gas Fee Optimizer',
        description: '智能 Gas 费用优化助手',
        capabilities: ['gas-optimization', 'transaction-timing'],
        tags: ['optimization', 'gas', 'ethereum'],
      },
    },
    {
      name: 'Smart Contract Auditor',
      metadata: {
        name: 'Smart Contract Auditor',
        description: '自动化智能合约安全审计',
        capabilities: ['security-audit', 'vulnerability-detection'],
        tags: ['security', 'audit', 'smart-contracts'],
      },
    },
  ];

  console.log(`注册 ${agentsToRegister.length} 个 Agents...`);

  for (const agentData of agentsToRegister) {
    try {
      const { agentId, txHash } = await service.registerAgent(
        agentData.name,
        agentData.metadata as any
      );

      console.log(`✅ ${agentData.name} 注册成功 (ID: ${agentId})`);

      // 避免 nonce 冲突，等待一段时间
      await new Promise((resolve) => setTimeout(resolve, 5000));
    } catch (error) {
      console.error(`❌ ${agentData.name} 注册失败:`, error);
    }
  }

  console.log('\n批量注册完成！\n');
}

// ============================================
// 运行示例
// ============================================

// 检查环境变量
if (!process.env.X402_WALLET_PRIVATE_KEY) {
  console.error('❌ 错误: 请设置 X402_WALLET_PRIVATE_KEY 环境变量');
  process.exit(1);
}

// 运行主示例
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

// 取消注释以运行批量操作示例
// batchOperationsExample().catch(console.error);
