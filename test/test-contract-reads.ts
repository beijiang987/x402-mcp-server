/**
 * 测试合约读方法
 *
 * 用途：验证 ABI 导入正确，合约调用正常工作
 * 不需要：私钥、ETH
 */

import 'dotenv/config';
import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import IdentityRegistryABIRaw from '../src/erc8004/abis/IdentityRegistry.json' with { type: 'json' };
import ReputationRegistryABIRaw from '../src/erc8004/abis/ReputationRegistry.json' with { type: 'json' };

const IdentityRegistryABI = { abi: IdentityRegistryABIRaw as any };
const ReputationRegistryABI = { abi: ReputationRegistryABIRaw as any };

const RPC_URL = process.env.RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY';
const IDENTITY_REGISTRY = '0x8004A818BFB912233c491871b3d84c89A494BD9e';
const REPUTATION_REGISTRY = '0x8004B663056A597Dffe9eCcC1965A193B7388713';

async function testContractReads() {
  console.log('🧪 测试 ERC-8004 合约读方法\n');
  console.log('='.repeat(60));

  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(RPC_URL),
  });

  console.log('\n📖 IdentityRegistry 合约\n');
  console.log('-'.repeat(60));

  try {
    // 测试 1: name()
    const name = await publicClient.readContract({
      address: IDENTITY_REGISTRY as `0x${string}`,
      abi: IdentityRegistryABI.abi,
      functionName: 'name',
    });
    console.log(`✅ name() = "${name}"`);
  } catch (error: any) {
    console.log(`❌ name() 失败: ${error.message}`);
  }

  try {
    // 测试 2: symbol()
    const symbol = await publicClient.readContract({
      address: IDENTITY_REGISTRY as `0x${string}`,
      abi: IdentityRegistryABI.abi,
      functionName: 'symbol',
    });
    console.log(`✅ symbol() = "${symbol}"`);
  } catch (error: any) {
    console.log(`❌ symbol() 失败: ${error.message}`);
  }

  try {
    // 测试 3: getVersion()
    const version = await publicClient.readContract({
      address: IDENTITY_REGISTRY as `0x${string}`,
      abi: IdentityRegistryABI.abi,
      functionName: 'getVersion',
    });
    console.log(`✅ getVersion() = "${version}"`);
  } catch (error: any) {
    console.log(`❌ getVersion() 失败: ${error.message}`);
  }

  try {
    // 测试 4: owner()
    const owner = await publicClient.readContract({
      address: IDENTITY_REGISTRY as `0x${string}`,
      abi: IdentityRegistryABI.abi,
      functionName: 'owner',
    });
    console.log(`✅ owner() = ${owner}`);
  } catch (error: any) {
    console.log(`❌ owner() 失败: ${error.message}`);
  }

  try {
    // 测试 5: balanceOf (测试钱包)
    const testAddress = '0xF8ce6Ae465d14dc8Be9C249D4872D0b60B083C63';
    const balance = await publicClient.readContract({
      address: IDENTITY_REGISTRY as `0x${string}`,
      abi: IdentityRegistryABI.abi,
      functionName: 'balanceOf',
      args: [testAddress],
    });
    console.log(`✅ balanceOf(${testAddress}) = ${balance}`);
  } catch (error: any) {
    console.log(`❌ balanceOf() 失败: ${error.message}`);
  }

  console.log('\n' + '-'.repeat(60));
  console.log('\n📊 ReputationRegistry 合约\n');
  console.log('-'.repeat(60));

  // 列出 ReputationRegistry 的读方法
  const reputationAbi = ReputationRegistryABIRaw as any[];
  const reputationReadMethods = reputationAbi
    .filter(item => item.type === 'function' && (item.stateMutability === 'view' || item.stateMutability === 'pure'))
    .slice(0, 5);

  console.log('\n可用的读方法:');
  reputationReadMethods.forEach((func, i) => {
    const inputs = func.inputs.map((input: any) => `${input.type} ${input.name}`).join(', ');
    console.log(`  ${i + 1}. ${func.name}(${inputs})`);
  });

  try {
    // 测试任意一个简单方法
    const firstMethod = reputationReadMethods.find((func: any) => func.inputs.length === 0);
    if (firstMethod) {
      const result = await publicClient.readContract({
        address: REPUTATION_REGISTRY as `0x${string}`,
        abi: ReputationRegistryABI.abi,
        functionName: firstMethod.name,
      });
      console.log(`\n✅ ${firstMethod.name}() = ${result}`);
    }
  } catch (error: any) {
    console.log(`\n❌ 读取失败: ${error.message}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n🎉 测试完成！\n');
}

testContractReads().catch(console.error);
