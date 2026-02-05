/**
 * 快速 RPC 连接测试
 *
 * 用途：验证 Sepolia RPC 端点是否可用（不需要私钥）
 * 运行：npx tsx test/test-rpc-connection.ts
 */

import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import 'dotenv/config';

const RPC_URL = process.env.X402_RPC_URL || 'https://rpc.sepolia.org';

console.log('🔍 测试 RPC 连接...');
console.log(`📡 RPC URL: ${RPC_URL}`);
console.log('');

async function testRPCConnection() {
  try {
    // 创建公共客户端（不需要私钥）
    const publicClient = createPublicClient({
      chain: sepolia,
      transport: http(RPC_URL),
    });

    console.log('1️⃣ 测试区块高度查询...');
    const blockNumber = await publicClient.getBlockNumber();
    console.log(`   ✅ 当前区块: ${blockNumber}`);
    console.log('');

    console.log('2️⃣ 测试合约代码查询...');
    const IDENTITY_REGISTRY = '0x8004A818BFB912233c491871b3d84c89A494BD9e';
    const code = await publicClient.getBytecode({
      address: IDENTITY_REGISTRY as `0x${string}`,
    });

    if (code && code.length > 100) {
      console.log(`   ✅ IdentityRegistry 合约已部署`);
      console.log(`   📦 Bytecode 长度: ${code.length} 字节`);
    } else {
      console.log(`   ❌ IdentityRegistry 合约未找到`);
      process.exit(1);
    }
    console.log('');

    console.log('3️⃣ 测试 Gas Price 查询...');
    const gasPrice = await publicClient.getGasPrice();
    console.log(`   ✅ 当前 Gas Price: ${gasPrice} wei`);
    console.log(`   💰 约 ${Number(gasPrice) / 1e9} Gwei`);
    console.log('');

    console.log('🎉 RPC 连接测试通过！');
    console.log('');
    console.log('下一步：');
    console.log('1. 配置测试钱包私钥到 .env 文件');
    console.log('2. 确保钱包有测试 ETH（访问 https://sepoliafaucet.com/）');
    console.log('3. 运行完整冒烟测试: npm run test:smoke');

  } catch (error: any) {
    console.error('❌ RPC 连接失败:', error.message);
    console.log('');
    console.log('可能的原因：');
    console.log('- RPC URL 不正确或不可用');
    console.log('- 网络连接问题');
    console.log('- 速率限制（公共 RPC 可能有限制）');
    console.log('');
    console.log('解决方案：');
    console.log('- 尝试其他公共 RPC: https://chainlist.org/chain/11155111');
    console.log('- 或申请 Infura/Alchemy API key');
    process.exit(1);
  }
}

testRPCConnection();
