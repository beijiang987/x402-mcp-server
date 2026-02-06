/**
 * 查询 Sepolia 上的实际 Feedback 数据
 *
 * 目的：验证 tag1/tag2 字段是否包含我们假设的标签
 * （accuracy, reliability, speed, value 等）
 */

import { GraphQLClient } from 'graphql-request';

const SUBGRAPH_URL =
  'https://gateway.thegraph.com/api/00a452ad3cd1900273ea62c1bf283f93/subgraphs/id/6wQRC7geo9XYAhckfmfo8kbMRLeWU8KQd3XsJqFKmZLT';

const client = new GraphQLClient(SUBGRAPH_URL);

async function checkFeedbackTags() {
  console.log('🔍 查询 Sepolia Testnet 上的 Feedback 数据...\n');

  const query = `
    query {
      feedbacks(first: 100, orderBy: createdAt, orderDirection: desc) {
        id
        agent {
          id
        }
        clientAddress
        value
        tag1
        tag2
        createdAt
      }
    }
  `;

  try {
    const data = await client.request<{ feedbacks: any[] }>(query);
    const feedbacks = data.feedbacks;

    console.log(`✅ 查询到 ${feedbacks.length} 条 Feedback 记录\n`);

    // 统计标签使用情况
    const tag1Counts: Record<string, number> = {};
    const tag2Counts: Record<string, number> = {};
    let tag1Empty = 0;
    let tag2Empty = 0;

    for (const feedback of feedbacks) {
      if (feedback.tag1) {
        tag1Counts[feedback.tag1] = (tag1Counts[feedback.tag1] || 0) + 1;
      } else {
        tag1Empty++;
      }

      if (feedback.tag2) {
        tag2Counts[feedback.tag2] = (tag2Counts[feedback.tag2] || 0) + 1;
      } else {
        tag2Empty++;
      }
    }

    // 统计 value 分布（正面 vs 负面）
    // 注意：value 可能是数字或字符串
    const valueStats = {
      positive: 0,
      negative: 0,
      zero: 0,
    };

    for (const feedback of feedbacks) {
      const numericValue = Number(feedback.value);
      if (numericValue > 0) valueStats.positive++;
      else if (numericValue < 0) valueStats.negative++;
      else valueStats.zero++;
    }

    // 输出报告
    console.log('📊 标签使用统计\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('tag1 字段:');
    console.log(`  - 非空: ${feedbacks.length - tag1Empty} (${((feedbacks.length - tag1Empty) / feedbacks.length * 100).toFixed(1)}%)`);
    console.log(`  - 为空: ${tag1Empty} (${(tag1Empty / feedbacks.length * 100).toFixed(1)}%)\n`);

    if (Object.keys(tag1Counts).length > 0) {
      console.log('  前 10 个 tag1 值:');
      const sortedTag1 = Object.entries(tag1Counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
      for (const [tag, count] of sortedTag1) {
        console.log(`    "${tag}": ${count} 次`);
      }
    }

    console.log('\ntag2 字段:');
    console.log(`  - 非空: ${feedbacks.length - tag2Empty} (${((feedbacks.length - tag2Empty) / feedbacks.length * 100).toFixed(1)}%)`);
    console.log(`  - 为空: ${tag2Empty} (${(tag2Empty / feedbacks.length * 100).toFixed(1)}%)\n`);

    if (Object.keys(tag2Counts).length > 0) {
      console.log('  前 10 个 tag2 值:');
      const sortedTag2 = Object.entries(tag2Counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
      for (const [tag, count] of sortedTag2) {
        console.log(`    "${tag}": ${count} 次`);
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📈 value 评分分布\n');
    console.log(`  正面反馈 (value > 0): ${valueStats.positive} (${(valueStats.positive / feedbacks.length * 100).toFixed(1)}%)`);
    console.log(`  负面反馈 (value < 0): ${valueStats.negative} (${(valueStats.negative / feedbacks.length * 100).toFixed(1)}%)`);
    console.log(`  中性反馈 (value = 0): ${valueStats.zero} (${(valueStats.zero / feedbacks.length * 100).toFixed(1)}%)`);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('💡 结论\n');

    // 检查是否包含我们假设的标签
    const allTags = [...Object.keys(tag1Counts), ...Object.keys(tag2Counts)];
    const expectedTags = [
      'accuracy', 'correctness', 'quality',
      'reliability', 'uptime', 'stability',
      'speed', 'latency', 'response-time', 'performance',
      'value', 'cost', 'price', 'cost-effectiveness',
    ];

    const matchedTags = expectedTags.filter((expected) =>
      allTags.some((actual) => actual.toLowerCase().includes(expected.toLowerCase()))
    );

    if (matchedTags.length > 0) {
      console.log(`✅ 发现 ${matchedTags.length} 个预期标签: ${matchedTags.join(', ')}`);
      console.log('   可以使用基于标签的四维度评分\n');
    } else {
      console.log('❌ 未发现预期标签 (accuracy, reliability, speed, value)');
      console.log('   建议使用降级方案: value 正负比例\n');
    }

    // 示例数据
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📄 前 5 条 Feedback 示例\n');
    for (let i = 0; i < Math.min(5, feedbacks.length); i++) {
      const f = feedbacks[i];
      const numericValue = Number(f.value);
      console.log(`${i + 1}. Agent ${f.agent.id}`);
      console.log(`   value: ${numericValue.toFixed(2)} (${numericValue > 0 ? '正面' : numericValue < 0 ? '负面' : '中性'})`);
      console.log(`   tag1: ${f.tag1 || '(空)'}`);
      console.log(`   tag2: ${f.tag2 || '(空)'}`);
      console.log(`   createdAt: ${new Date(f.createdAt * 1000).toISOString()}\n`);
    }
  } catch (error: any) {
    console.error('❌ 查询失败:', error.message);
    process.exit(1);
  }
}

checkFeedbackTags();
