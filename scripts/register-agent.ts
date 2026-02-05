/**
 * 实际注册 Agent 到 ERC-8004
 *
 * 前置条件:
 * 1. .env 中配置了 PRIVATE_KEY 和 RPC_URL
 * 2. 钱包有至少 0.01 ETH（Sepolia 测试网）
 *
 * 运行: npx tsx scripts/register-agent.ts
 */

import 'dotenv/config';
import { createPublicClient, createWalletClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import IdentityRegistryABIRaw from '../src/erc8004/abis/IdentityRegistry.json' with { type: 'json' };

const IdentityRegistryABI = { abi: IdentityRegistryABIRaw as any };

// 配置
const RPC_URL = process.env.RPC_URL!;
const PRIVATE_KEY = process.env.PRIVATE_KEY as `0x${string}`;
const IDENTITY_REGISTRY = '0x8004A818BFB912233c491871b3d84c89A494BD9e';

// Agent 注册文件（符合 EIP-8004 规范）
const REGISTRATION_FILE = {
  type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
  name: 'x402 MCP Server Agent',
  description: 'ERC-8004 + x402 声誉聚合和搜索服务',
  image: 'https://via.placeholder.com/400x400.png?text=x402+MCP',
  services: [
    {
      name: 'web',
      endpoint: 'https://x402-mcp-server.vercel.app/',
      version: '1.0.0',
    },
    {
      name: 'MCP',
      endpoint: 'https://x402-mcp-server.vercel.app/mcp',
      capabilities: {
        tools: [
          'erc8004_search_agents',
          'erc8004_get_agent',
          'erc8004_get_reputation',
        ],
      },
    },
    {
      name: 'OASF',
      endpoint: 'https://x402-mcp-server.vercel.app/api/openapi.json',
      skills: ['agent-search', 'reputation-analysis', 'feedback-aggregation'],
      domains: ['blockchain', 'ai-agents', 'reputation-systems'],
    },
  ],
  x402Support: true,
  active: true,
  registrations: [],
};

async function registerAgent() {
  console.log('🚀 开始注册 ERC-8004 Agent\n');
  console.log('='.repeat(60));

  // 验证环境变量
  if (!RPC_URL || !PRIVATE_KEY) {
    console.error('❌ 缺少环境变量:');
    console.error('   - RPC_URL');
    console.error('   - PRIVATE_KEY');
    console.error('\n请在 .env 文件中配置这些变量');
    process.exit(1);
  }

  const account = privateKeyToAccount(PRIVATE_KEY);

  console.log(`\n📡 RPC: ${RPC_URL.substring(0, 50)}...`);
  console.log(`🔑 账户: ${account.address}`);
  console.log(`📄 合约: ${IDENTITY_REGISTRY}\n`);

  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(RPC_URL),
  });

  const walletClient = createWalletClient({
    account,
    chain: sepolia,
    transport: http(RPC_URL),
  });

  // 1. 检查余额
  console.log('步骤 1: 检查账户余额');
  console.log('-'.repeat(60));

  const balance = await publicClient.getBalance({ address: account.address });
  const balanceInEth = Number(balance) / 1e18;

  console.log(`💰 余额: ${balanceInEth.toFixed(4)} ETH`);

  if (balanceInEth < 0.01) {
    console.error('\n❌ 余额不足！');
    console.error('   需要至少 0.01 ETH');
    console.error('   请访问 https://sepoliafaucet.com/ 获取测试 ETH');
    console.error(`   钱包地址: ${account.address}`);
    process.exit(1);
  }

  // 2. 准备注册文件
  console.log('\n步骤 2: 准备注册文件');
  console.log('-'.repeat(60));

  // 选项 A: 使用 data URI（小文件，适合测试）
  const registrationFileJson = JSON.stringify(REGISTRATION_FILE, null, 2);
  const base64Data = Buffer.from(registrationFileJson).toString('base64');
  const agentURI = `data:application/json;base64,${base64Data}`;

  console.log('✅ 使用 data URI 格式');
  console.log(`📏 大小: ${registrationFileJson.length} 字节`);
  console.log(`🔗 URI 长度: ${agentURI.length} 字节`);

  // 选项 B: IPFS（生产环境推荐）
  console.log('\n💡 提示: 生产环境建议使用 IPFS:');
  console.log('   1. 上传到 IPFS: ipfs add registration.json');
  console.log('   2. 使用 IPFS URI: ipfs://QmXxx...');

  // 3. 估算 Gas
  console.log('\n步骤 3: 估算 Gas 费用');
  console.log('-'.repeat(60));

  try {
    const gasEstimate = await publicClient.estimateContractGas({
      address: IDENTITY_REGISTRY as `0x${string}`,
      abi: IdentityRegistryABI.abi,
      functionName: 'register',
      args: [agentURI, []],
      account,
    });

    const gasPrice = await publicClient.getGasPrice();
    const estimatedCost = (gasEstimate * gasPrice) / BigInt(1e18);

    console.log(`⛽ 估算 Gas: ${gasEstimate.toString()}`);
    console.log(`💵 Gas Price: ${Number(gasPrice) / 1e9} Gwei`);
    console.log(`💰 预计费用: ${Number(estimatedCost) / 1e18} ETH`);
  } catch (error: any) {
    console.error(`⚠️  Gas 估算失败: ${error.message}`);
    console.error('   继续执行...\n');
  }

  // 4. 执行注册
  console.log('\n步骤 4: 发送注册交易');
  console.log('-'.repeat(60));

  try {
    const hash = await walletClient.writeContract({
      address: IDENTITY_REGISTRY as `0x${string}`,
      abi: IdentityRegistryABI.abi,
      functionName: 'register',
      args: [agentURI, []],
    });

    console.log(`✅ 交易已发送: ${hash}`);
    console.log(`🔗 查看交易: https://sepolia.etherscan.io/tx/${hash}`);

    // 5. 等待确认
    console.log('\n步骤 5: 等待交易确认');
    console.log('-'.repeat(60));
    console.log('⏳ 等待区块确认...');

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status === 'success') {
      console.log(`✅ 交易成功！`);
      console.log(`📦 区块: ${receipt.blockNumber}`);
      console.log(`⛽ Gas 使用: ${receipt.gasUsed.toString()}`);

      // 6. 解析 agentId
      console.log('\n步骤 6: 获取 Agent ID');
      console.log('-'.repeat(60));

      // Transfer 事件: Transfer(address indexed from, address indexed to, uint256 indexed tokenId)
      const transferEvent = receipt.logs.find((log) => {
        return (
          log.address.toLowerCase() === IDENTITY_REGISTRY.toLowerCase() &&
          log.topics[0] ===
            '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' // Transfer event signature
        );
      });

      if (transferEvent && transferEvent.topics[3]) {
        const agentId = BigInt(transferEvent.topics[3]);
        console.log(`✅ Agent ID: ${agentId}`);
        console.log(`🔗 查看 Agent: https://sepolia.etherscan.io/token/${IDENTITY_REGISTRY}?a=${agentId}`);

        // 7. 验证注册
        console.log('\n步骤 7: 验证注册结果');
        console.log('-'.repeat(60));

        const tokenURI = await publicClient.readContract({
          address: IDENTITY_REGISTRY as `0x${string}`,
          abi: IdentityRegistryABI.abi,
          functionName: 'tokenURI',
          args: [agentId],
        });

        console.log(`✅ tokenURI 已设置: ${tokenURI.substring(0, 80)}...`);

        const owner = await publicClient.readContract({
          address: IDENTITY_REGISTRY as `0x${string}`,
          abi: IdentityRegistryABI.abi,
          functionName: 'ownerOf',
          args: [agentId],
        });

        console.log(`✅ Owner: ${owner}`);

        console.log('\n' + '='.repeat(60));
        console.log('🎉 注册完成！');
        console.log('='.repeat(60));

        console.log(`\n📋 Agent 信息:`);
        console.log(`   - Agent ID: ${agentId}`);
        console.log(`   - Owner: ${owner}`);
        console.log(`   - Name: ${REGISTRATION_FILE.name}`);
        console.log(`   - Services: ${REGISTRATION_FILE.services.length} 个`);

        console.log(`\n🔗 链接:`);
        console.log(`   - Etherscan: https://sepolia.etherscan.io/tx/${hash}`);
        console.log(`   - Token: https://sepolia.etherscan.io/token/${IDENTITY_REGISTRY}?a=${agentId}`);

        console.log(`\n📝 下一步:`);
        console.log(`   1. 等待 1-5 分钟让 The Graph 索引`);
        console.log(`   2. 运行 Subgraph 查询验证: npx tsx test/test-subgraph.ts`);
        console.log(`   3. 在搜索服务中应该能找到你的 Agent`);
        console.log(`   4. 其他人可以给你的 Agent 提交反馈`);
      } else {
        console.log('⚠️  无法解析 Agent ID，但注册应该成功了');
        console.log('   请查看 Etherscan 确认');
      }
    } else {
      console.error(`❌ 交易失败`);
      console.error(`   状态: ${receipt.status}`);
      console.error(`   查看详情: https://sepolia.etherscan.io/tx/${hash}`);
      process.exit(1);
    }
  } catch (error: any) {
    console.error(`\n❌ 注册失败: ${error.message}`);

    if (error.message.includes('insufficient funds')) {
      console.error('\n   原因: 余额不足');
      console.error('   请确保钱包有足够的 ETH 支付 gas 费');
    } else if (error.message.includes('nonce')) {
      console.error('\n   原因: Nonce 错误');
      console.error('   请等待之前的交易确认');
    } else {
      console.error('\n   详细错误:', error);
    }

    process.exit(1);
  }
}

// 运行
registerAgent().catch((error) => {
  console.error('💥 意外错误:', error);
  process.exit(1);
});
