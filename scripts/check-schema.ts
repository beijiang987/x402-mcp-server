/**
 * 检查 Subgraph 的实际 schema
 */

import { GraphQLClient } from 'graphql-request';

const SUBGRAPH_URL =
  'https://gateway.thegraph.com/api/00a452ad3cd1900273ea62c1bf283f93/subgraphs/id/6wQRC7geo9XYAhckfmfo8kbMRLeWU8KQd3XsJqFKmZLT';

const client = new GraphQLClient(SUBGRAPH_URL);

async function checkSchema() {
  console.log('🔍 检查 Feedback 实体的字段...\n');

  // 尝试查询 1 条数据，看看有什么字段
  const query = `
    query {
      feedbacks(first: 1) {
        id
      }
    }
  `;

  try {
    const data = await client.request<{ feedbacks: any[] }>(query);
    console.log('✅ 基础查询成功\n');
    console.log('现在尝试所有可能的字段...\n');

    // 测试各种字段组合
    const testFields = [
      'id',
      'feedbackId',
      'agentId',
      'agent',
      'clientAddress',
      'reviewer',
      'value',
      'valueDecimals',
      'tag1',
      'tag2',
      'tags',
      'createdAt',
      'timestamp',
      'revoked',
    ];

    const availableFields: string[] = [];

    for (const field of testFields) {
      const testQuery = `
        query {
          feedbacks(first: 1) {
            id
            ${field}
          }
        }
      `;

      try {
        await client.request(testQuery);
        availableFields.push(field);
        console.log(`✅ ${field}`);
      } catch (error) {
        console.log(`❌ ${field}`);
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📋 可用字段列表:\n');
    console.log(availableFields.join(', '));
  } catch (error: any) {
    console.error('❌ 查询失败:', error.message);
    process.exit(1);
  }
}

checkSchema();
