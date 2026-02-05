/**
 * ERC-8004 Sepolia 冒烟测试
 *
 * 用途：验证与官方合约的集成是否正确
 *
 * 运行方式:
 *   npx tsx test/smoke-test-sepolia.ts
 *
 * 前置条件:
 *   1. 从官方仓库复制了 ABI 文件到 src/erc8004/abis/
 *   2. 有 Sepolia ETH 的测试钱包
 *   3. 有 Infura/Alchemy API Key
 *   4. 配置了环境变量（自动从 .env 加载）:
 *      - RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
 *      - PRIVATE_KEY=0x...
 */

import 'dotenv/config';
import {
  createPublicClient,
  createWalletClient,
  http,
  encodePacked,
  keccak256,
} from 'viem';
import { sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

// ✅ 从官方 ABI 文件导入（已完成）
// 注意：官方文件名是 IdentityRegistry.json（不是 IdentityRegistryUpgradeable.json）
import IdentityRegistryABIRaw from '../src/erc8004/abis/IdentityRegistry.json' with { type: 'json' };
import ReputationRegistryABIRaw from '../src/erc8004/abis/ReputationRegistry.json' with { type: 'json' };

// 包装为预期的格式
const IdentityRegistryABI = { abi: IdentityRegistryABIRaw as any };
const ReputationRegistryABI = { abi: ReputationRegistryABIRaw as any };

// ============================================
// 配置
// ============================================

const RPC_URL =
  process.env.RPC_URL || 'https://sepolia.infura.io/v3/YOUR_API_KEY';
const PRIVATE_KEY = process.env.PRIVATE_KEY as `0x${string}`;

// 官方合约地址 (Sepolia)
const IDENTITY_REGISTRY = '0x8004A818BFB912233c491871b3d84c89A494BD9e';
const REPUTATION_REGISTRY = '0x8004B663056A597Dffe9eCcC1965A193B7388713';

// ============================================
// 主测试函数
// ============================================

async function smokeTest() {
  console.log('🧪 ERC-8004 Sepolia 冒烟测试\n');
  console.log('=' + '='.repeat(60) + '\n');

  // 检查环境变量
  if (!PRIVATE_KEY || PRIVATE_KEY === '0x') {
    console.error('❌ 错误: 请设置 PRIVATE_KEY 环境变量');
    console.log('   export PRIVATE_KEY=0x...');
    process.exit(1);
  }

  if (RPC_URL.includes('YOUR_API_KEY')) {
    console.error('❌ 错误: 请设置 RPC_URL 环境变量');
    console.log('   export RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY');
    process.exit(1);
  }

  const account = privateKeyToAccount(PRIVATE_KEY);
  console.log(`🔑 使用账户: ${account.address}`);

  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(RPC_URL),
  });

  const walletClient = createWalletClient({
    account,
    chain: sepolia,
    transport: http(RPC_URL),
  });

  // ========================================
  // 测试 1: 检查合约是否存在
  // ========================================
  console.log('\n' + '-'.repeat(60));
  console.log('测试 1: 检查合约部署');
  console.log('-'.repeat(60));

  try {
    const identityCode = await publicClient.getBytecode({
      address: IDENTITY_REGISTRY as `0x${string}`,
    });
    const reputationCode = await publicClient.getBytecode({
      address: REPUTATION_REGISTRY as `0x${string}`,
    });

    if (!identityCode || identityCode === '0x') {
      console.error('❌ IdentityRegistry 合约不存在');
      console.log('   地址可能错误或网络不对');
      process.exit(1);
    }

    if (!reputationCode || reputationCode === '0x') {
      console.error('❌ ReputationRegistry 合约不存在');
      process.exit(1);
    }

    console.log('✅ IdentityRegistry 合约存在');
    console.log('✅ ReputationRegistry 合约存在');
  } catch (e: any) {
    console.error(`❌ 检查合约失败: ${e.message}`);
    process.exit(1);
  }

  // ========================================
  // 测试 2: 检查账户余额
  // ========================================
  console.log('\n' + '-'.repeat(60));
  console.log('测试 2: 检查账户余额');
  console.log('-'.repeat(60));

  try {
    const balance = await publicClient.getBalance({
      address: account.address,
    });
    const ethBalance = Number(balance) / 1e18;

    console.log(`💰 余额: ${ethBalance.toFixed(4)} ETH`);

    if (ethBalance < 0.01) {
      console.warn('⚠️  余额较低，建议至少 0.01 ETH');
      console.log(
        '   获取测试 ETH: https://sepoliafaucet.com/ 或 https://faucet.quicknode.com/ethereum/sepolia'
      );
    } else {
      console.log('✅ 余额充足');
    }
  } catch (e: any) {
    console.error(`❌ 检查余额失败: ${e.message}`);
  }

  // ========================================
  // 测试 3: 读取链上数据（不需要 gas）
  // ========================================
  console.log('\n' + '-'.repeat(60));
  console.log('测试 3: 读取合约状态');
  console.log('-'.repeat(60));

  console.log('\n⚠️  警告: 需要真实的 ABI 才能进行此测试');
  console.log('   1. 克隆官方仓库: git clone https://github.com/erc-8004/erc-8004-contracts.git');
  console.log('   2. 复制 ABI: cp erc-8004-contracts/abis/*.json src/erc8004/abis/');
  console.log('   3. 在本文件中取消 import 语句的注释');
  console.log('   4. 重新运行此脚本\n');

  if (IdentityRegistryABI.abi.length === 0) {
    console.log('⏭️  跳过读取测试（ABI 未导入）\n');
  } else {
    try {
      // 示例：读取 totalSupply
      // 注意：函数名可能不同，需要查看 ABI
      const totalSupply = await publicClient.readContract({
        address: IDENTITY_REGISTRY as `0x${string}`,
        abi: IdentityRegistryABI.abi,
        functionName: 'totalSupply', // 从 ABI 确认函数名
      });
      console.log(`✅ 已注册 agents 总数: ${totalSupply}`);
    } catch (e: any) {
      console.error(`❌ 读取失败: ${e.message}`);
      console.log('   可能原因:');
      console.log('   - 函数名不对（检查 ABI 中的实际函数名）');
      console.log('   - ABI 格式不对');
    }
  }

  // ========================================
  // 测试 4: 模拟注册（不发送交易）
  // ========================================
  console.log('\n' + '-'.repeat(60));
  console.log('测试 4: 模拟 Agent 注册');
  console.log('-'.repeat(60));

  if (IdentityRegistryABI.abi.length === 0) {
    console.log('⏭️  跳过注册模拟（ABI 未导入）\n');
  } else {
    // 准备符合官方规范的 Registration File
    const registrationFile = {
      type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
      name: 'Smoke Test Agent',
      description: 'Testing ERC-8004 integration on Sepolia',
      image: 'https://example.com/agent.png',
      services: [
        {
          name: 'web',
          endpoint: 'https://your-agent.example.com/',
        },
      ],
      x402Support: true,
      active: true,
      registrations: [],
    };

    // 使用 data URI 或 IPFS
    const registrationJSON = JSON.stringify(registrationFile);
    const base64Data = Buffer.from(registrationJSON).toString('base64');
    const agentURI = `data:application/json;base64,${base64Data}`;

    try {
      // 模拟注册（不实际发送）
      // 注意：参数格式需要看官方 ABI
      // 可能是 register(string agentURI, MetadataEntry[] metadata)
      const { request } = await publicClient.simulateContract({
        address: IDENTITY_REGISTRY as `0x${string}`,
        abi: IdentityRegistryABI.abi,
        functionName: 'register', // 从 ABI 确认函数名
        args: [agentURI, []], // MetadataEntry[] 为空数组测试
        account,
      });

      console.log('✅ 模拟注册成功（未实际发送交易）');
      console.log('   函数名: register');
      console.log(`   参数: agentURI, []`);
      console.log('\n💡 如果要实际注册，运行:');
      console.log('   const hash = await walletClient.writeContract(request);');
      console.log('   const receipt = await publicClient.waitForTransactionReceipt({ hash });');
    } catch (e: any) {
      console.error(`❌ 模拟注册失败: ${e.message}`);
      console.log('\n🔍 排查步骤:');
      console.log('   1. 检查 ABI 是否正确（从官方仓库复制）');
      console.log('   2. 确认函数名（可能不叫 register）');
      console.log('   3. 确认参数格式（查看 ABI 中的 inputs）');
      console.log('   4. 确保账户有足够的 Sepolia ETH');
    }
  }

  // ========================================
  // 总结
  // ========================================
  console.log('\n' + '='.repeat(60));
  console.log('🏁 测试完成');
  console.log('='.repeat(60) + '\n');

  console.log('📋 下一步:');
  console.log('   1. 如果测试失败，对照官方 ABI 逐项排查');
  console.log('   2. 实际注册一个 agent 并记录 agentId');
  console.log('   3. 测试 ReputationRegistry 的反馈功能');
  console.log('   4. 测试 ValidationRegistry（如果需要）');
  console.log('   5. 集成到 API 和 MCP 工具\n');
}

// ============================================
// 运行测试
// ============================================

smokeTest().catch((error) => {
  console.error('\n💥 测试异常终止:', error);
  process.exit(1);
});
