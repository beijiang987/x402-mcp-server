/**
 * 示例：使用 x402 数据服务的简单套利 Trading Agent
 *
 * 这个 Agent 会：
 * 1. 监控跨链价格差异
 * 2. 识别套利机会
 * 3. 通过 x402 支付数据服务费用
 * 4. 自动执行套利交易（演示用，不包含实际交易逻辑）
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

interface ArbitrageOpportunity {
  token: string;
  buyChain: string;
  sellChain: string;
  buyPrice: number;
  sellPrice: number;
  profitPercent: number;
  estimatedProfit: number;
}

class SimpleArbitrageAgent {
  private mcpClient: Client;
  private isRunning: boolean = false;
  private checkInterval: number = 30000; // 30 秒检查一次
  private minProfitPercent: number = 1.0; // 最低 1% 利润才执行
  private tradingAmount: number = 1000; // 每次交易 $1000

  constructor() {
    this.mcpClient = new Client(
      {
        name: 'arbitrage-agent',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );
  }

  /**
   * 启动 Agent
   */
  async start() {
    console.log('🤖 启动套利 Agent...');

    // 连接到 x402 MCP 服务器
    const transport = new StdioClientTransport({
      command: 'node',
      args: ['../dist/index.js'],
    });

    await this.mcpClient.connect(transport);
    console.log('✅ 已连接到 x402 数据服务');

    this.isRunning = true;
    this.run();
  }

  /**
   * 主循环
   */
  private async run() {
    while (this.isRunning) {
      try {
        console.log('\n🔍 检查套利机会...');

        // 监控的代币列表
        const tokens = ['USDC', 'WETH', 'USDT'];

        for (const token of tokens) {
          const opportunity = await this.checkArbitrageOpportunity(token);

          if (opportunity && opportunity.profitPercent >= this.minProfitPercent) {
            console.log('💰 发现套利机会！');
            console.log(opportunity);

            // 在实际应用中，这里会执行交易
            await this.executeArbitrage(opportunity);
          }
        }

        // 等待下一次检查
        await this.sleep(this.checkInterval);
      } catch (error) {
        console.error('❌ 错误:', error);
        await this.sleep(5000); // 出错后等待 5 秒
      }
    }
  }

  /**
   * 检查套利机会
   */
  private async checkArbitrageOpportunity(
    tokenSymbol: string
  ): Promise<ArbitrageOpportunity | null> {
    try {
      // 调用 x402 数据服务获取跨链价格
      const result = await this.mcpClient.callTool({
        name: 'get_multichain_price',
        arguments: {
          token_symbol: tokenSymbol,
          chains: ['ethereum', 'base', 'polygon', 'arbitrum'],
        },
      });

      const data = JSON.parse(result.content[0].text);

      // 检查是否有套利机会
      if (data.arbitrageOpportunity) {
        const arb = data.arbitrageOpportunity;
        const buyPrice = data.prices[arb.buyChain].price;
        const sellPrice = data.prices[arb.sellChain].price;

        // 计算实际利润（扣除 Gas 费等）
        const grossProfit = (sellPrice - buyPrice) * this.tradingAmount;
        const gasCost = 20; // 估算跨链 Gas 费 $20
        const bridgeFee = this.tradingAmount * 0.001; // 0.1% 桥接费
        const netProfit = grossProfit - gasCost - bridgeFee;

        const netProfitPercent = (netProfit / this.tradingAmount) * 100;

        return {
          token: tokenSymbol,
          buyChain: arb.buyChain,
          sellChain: arb.sellChain,
          buyPrice,
          sellPrice,
          profitPercent: netProfitPercent,
          estimatedProfit: netProfit,
        };
      }

      return null;
    } catch (error) {
      console.error(`获取 ${tokenSymbol} 价格失败:`, error);
      return null;
    }
  }

  /**
   * 执行套利交易（演示用）
   */
  private async executeArbitrage(opportunity: ArbitrageOpportunity) {
    console.log('\n🚀 执行套利交易...');
    console.log(`代币: ${opportunity.token}`);
    console.log(`在 ${opportunity.buyChain} 买入: $${opportunity.buyPrice}`);
    console.log(`在 ${opportunity.sellChain} 卖出: $${opportunity.sellPrice}`);
    console.log(`预期利润: $${opportunity.estimatedProfit.toFixed(2)} (${opportunity.profitPercent.toFixed(2)}%)`);

    // 步骤 1: 检查代币安全性
    console.log('\n🔍 检查代币合约安全性...');
    const tokenAddress = this.getTokenAddress(opportunity.token, opportunity.buyChain);

    const safetyResult = await this.mcpClient.callTool({
      name: 'scan_contract_safety',
      arguments: {
        contract_address: tokenAddress,
        chain: opportunity.buyChain,
      },
    });

    const safetyData = JSON.parse(safetyResult.content[0].text);

    if (safetyData.riskScore > 50) {
      console.log('⚠️  风险评分过高，跳过此交易');
      return;
    }

    console.log(`✅ 安全评分: ${100 - safetyData.riskScore}/100`);

    // 步骤 2: 检查流动性
    console.log('\n💧 检查流动性池...');
    const poolAddress = this.getPoolAddress(opportunity.token, opportunity.buyChain);

    const poolResult = await this.mcpClient.callTool({
      name: 'get_pool_analytics',
      arguments: {
        pool_address: poolAddress,
        chain: opportunity.buyChain,
      },
    });

    const poolData = JSON.parse(poolResult.content[0].text);

    if (poolData.tvl < this.tradingAmount * 10) {
      console.log('⚠️  流动性不足，可能造成大滑点');
      return;
    }

    console.log(`✅ TVL: $${poolData.tvl.toLocaleString()}`);

    // 步骤 3: 监控巨鲸活动
    console.log('\n🐋 检查近期巨鲸活动...');
    const whaleResult = await this.mcpClient.callTool({
      name: 'get_whale_transactions',
      arguments: {
        token_address: tokenAddress,
        chain: opportunity.buyChain,
        min_amount_usd: 50000,
        limit: 5,
      },
    });

    const whaleData = JSON.parse(whaleResult.content[0].text);

    if (whaleData.length > 0) {
      console.log(`⚠️  检测到 ${whaleData.length} 笔巨鲸交易，市场可能波动`);
    }

    // 步骤 4: 执行交易（这里只是演示，不包含实际交易逻辑）
    console.log('\n💸 模拟交易执行...');
    console.log('1️⃣  在', opportunity.buyChain, '买入', opportunity.token);
    await this.sleep(1000);
    console.log('2️⃣  跨链桥接到', opportunity.sellChain);
    await this.sleep(2000);
    console.log('3️⃣  在', opportunity.sellChain, '卖出', opportunity.token);
    await this.sleep(1000);

    console.log('✅ 交易完成！');
    console.log(`💰 净利润: $${opportunity.estimatedProfit.toFixed(2)}`);

    // 计算数据服务成本
    const dataCost =
      0.001 + // get_multichain_price
      0.02 + // scan_contract_safety
      0.002 + // get_pool_analytics
      0.005; // get_whale_transactions

    console.log(`📊 数据服务费用: $${dataCost.toFixed(4)}`);
    console.log(`📈 ROI: ${((opportunity.estimatedProfit / dataCost) * 100).toFixed(2)}%`);
  }

  /**
   * 停止 Agent
   */
  async stop() {
    console.log('\n⏹️  停止 Agent...');
    this.isRunning = false;
    await this.mcpClient.close();
  }

  // ========== 辅助方法 ==========

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private getTokenAddress(symbol: string, chain: string): string {
    // 简化版本，实际应该从配置中读取
    const addresses: any = {
      USDC: {
        ethereum: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        base: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        polygon: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
      },
    };
    return addresses[symbol]?.[chain] || '0x0000000000000000000000000000000000000000';
  }

  private getPoolAddress(symbol: string, chain: string): string {
    // 简化版本，实际应该查询 DEX 工厂合约
    return '0x0000000000000000000000000000000000000000';
  }
}

// ========== 主程序 ==========

async function main() {
  const agent = new SimpleArbitrageAgent();

  // 处理退出信号
  process.on('SIGINT', async () => {
    await agent.stop();
    process.exit(0);
  });

  await agent.start();
}

main().catch(console.error);
