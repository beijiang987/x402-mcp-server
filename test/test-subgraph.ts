/**
 * 测试 The Graph Subgraph 查询
 *
 * 用途：验证 Subgraph URL 正确，GraphQL 查询正常工作
 */

import { GraphQLClient } from 'graphql-request';

// 官方 Subgraph URLs（来自 Agent0 SDK）
const SUBGRAPH_URLS = {
  sepolia: 'https://gateway.thegraph.com/api/00a452ad3cd1900273ea62c1bf283f93/subgraphs/id/6wQRC7geo9XYAhckfmfo8kbMRLeWU8KQd3XsJqFKmZLT',
  mainnet: 'https://gateway.thegraph.com/api/7fd2e7d89ce3ef24cd0d4590298f0b2c/subgraphs/id/FV6RR6y13rsnCxBAicKuQEwDp8ioEGiNaWaZUmvr1F8k',
};

async function testSubgraph() {
  console.log('🧪 测试 The Graph Subgraph 查询\n');
  console.log('='.repeat(60));

  const network = 'sepolia';
  const url = SUBGRAPH_URLS[network];

  console.log(`\n📡 网络: ${network}`);
  console.log(`🔗 URL: ${url.substring(0, 80)}...`);
  console.log('\n' + '-'.repeat(60));

  const client = new GraphQLClient(url);

  // 测试 1: _meta 查询（测试连接）
  console.log('\n📌 测试 1: 检查 Subgraph 元数据\n');
  try {
    const metaQuery = `
      query {
        _meta {
          block {
            number
            hash
          }
          deployment
          hasIndexingErrors
        }
      }
    `;

    const metaData = await client.request<any>(metaQuery);
    console.log(`✅ Subgraph 可访问`);
    console.log(`   区块高度: ${metaData._meta.block.number}`);
    console.log(`   区块哈希: ${metaData._meta.block.hash.substring(0, 20)}...`);
    console.log(`   Deployment: ${metaData._meta.deployment}`);
    console.log(`   索引错误: ${metaData._meta.hasIndexingErrors ? '是' : '否'}`);
  } catch (error: any) {
    console.log(`❌ 元数据查询失败: ${error.message}`);
    console.log(`   可能原因:`);
    console.log(`   - Subgraph URL 不正确`);
    console.log(`   - Subgraph 未同步`);
    console.log(`   - 网络问题`);
    return;
  }

  // 测试 2: 尝试查询 agents（可能为空）
  console.log('\n📌 测试 2: 查询已注册的 Agents\n');
  try {
    const agentsQuery = `
      query GetAgents($first: Int!) {
        agents(first: $first, orderBy: createdAt, orderDirection: desc) {
          id
          agentId
          owner
          agentURI
          createdAt
        }
      }
    `;

    const agentsData = await client.request<any>(agentsQuery, { first: 5 });

    if (agentsData.agents && agentsData.agents.length > 0) {
      console.log(`✅ 找到 ${agentsData.agents.length} 个 Agents:`);
      agentsData.agents.forEach((agent: any, i: number) => {
        console.log(`\n   Agent ${i + 1}:`);
        console.log(`   - ID: ${agent.id}`);
        console.log(`   - AgentId: ${agent.agentId}`);
        console.log(`   - Owner: ${agent.owner}`);
        console.log(`   - URI: ${agent.agentURI?.substring(0, 50)}...`);
        console.log(`   - Created: ${new Date(agent.createdAt * 1000).toISOString()}`);
      });
    } else {
      console.log(`✅ 查询成功，但没有找到 Agents（数据库可能为空）`);
      console.log(`   这是正常的，说明 Subgraph 工作正常`);
    }
  } catch (error: any) {
    console.log(`⚠️ Agents 查询失败: ${error.message}`);
    console.log(`   可能原因:`);
    console.log(`   - Schema 字段名不匹配（需要对照实际 schema）`);
    console.log(`   - Subgraph 还在索引中`);

    // 打印错误详情
    if (error.response?.errors) {
      console.log(`\n   GraphQL 错误详情:`);
      error.response.errors.forEach((err: any) => {
        console.log(`   - ${err.message}`);
      });
    }
  }

  // 测试 3: 尝试查询 schema（introspection）
  console.log('\n📌 测试 3: 查询可用的实体类型\n');
  try {
    const schemaQuery = `
      query {
        __schema {
          types {
            name
            kind
          }
        }
      }
    `;

    const schemaData = await client.request<any>(schemaQuery);
    const entityTypes = schemaData.__schema.types
      .filter((type: any) => type.kind === 'OBJECT' && !type.name.startsWith('_'))
      .map((type: any) => type.name);

    console.log(`✅ Subgraph Schema 包含以下实体:`);
    entityTypes.slice(0, 10).forEach((typeName: string) => {
      console.log(`   - ${typeName}`);
    });

    if (entityTypes.length > 10) {
      console.log(`   ... 还有 ${entityTypes.length - 10} 个实体`);
    }
  } catch (error: any) {
    console.log(`⚠️ Schema 查询失败: ${error.message}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n🎉 Subgraph 测试完成！\n');
}

testSubgraph().catch(console.error);
