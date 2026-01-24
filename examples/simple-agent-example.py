#!/usr/bin/env python3
"""
简单的 AI Agent 示例 - 使用 x402 数据服务

这个 Agent 演示如何：
1. 通过 MCP 调用 x402 数据服务
2. 自动支付数据费用
3. 基于数据做出决策
"""

import json
import time
from typing import Dict, List, Optional


class X402DataClient:
    """x402 数据服务客户端"""

    def __init__(self, mcp_server_url: str = "stdio://x402-mcp-server"):
        self.mcp_url = mcp_server_url
        # 在实际实现中，这里会建立到 MCP 服务器的连接
        print(f"📡 连接到 x402 数据服务: {mcp_server_url}")

    def get_token_price(self, token_address: str, chain: str = "ethereum") -> Dict:
        """获取代币价格"""
        # 模拟 MCP 调用
        print(f"🔍 查询 {token_address} 在 {chain} 上的价格...")

        # 实际实现会调用 MCP
        return {
            "address": token_address,
            "symbol": "WETH",
            "price": 3000.50,
            "priceUsd": 3000.50,
            "liquidity": 5000000,
            "volume24h": 1200000,
            "chain": chain,
            "source": "Uniswap V3",
            "timestamp": int(time.time() * 1000),
        }

    def get_multichain_price(
        self, token_symbol: str, chains: List[str] = None
    ) -> Dict:
        """获取跨链价格"""
        if chains is None:
            chains = ["ethereum", "base", "polygon"]

        print(f"🔍 查询 {token_symbol} 跨链价格...")

        return {
            "token": token_symbol,
            "prices": {
                "ethereum": {"price": 3000.50, "liquidity": 50000000, "bestDex": "Uniswap V3"},
                "base": {"price": 3005.20, "liquidity": 10000000, "bestDex": "Uniswap V3"},
                "polygon": {"price": 2998.80, "liquidity": 8000000, "bestDex": "QuickSwap"},
            },
            "arbitrageOpportunity": {
                "buyChain": "polygon",
                "sellChain": "base",
                "potentialProfit": 0.21,  # 0.21%
            },
        }

    def scan_contract_safety(
        self, contract_address: str, chain: str = "ethereum"
    ) -> Dict:
        """扫描合约安全性"""
        print(f"🔒 扫描合约 {contract_address[:10]}... 的安全性")

        return {
            "address": contract_address,
            "riskScore": 15,  # 0-100, 0 = 最安全
            "isVerified": True,
            "hasProxies": False,
            "hasHoneypot": False,
            "ownershipRenounced": True,
            "risks": [],
            "warnings": ["High concentration in top 10 holders"],
            "chain": chain,
        }


class SimpleTradingAgent:
    """简单的交易决策 Agent"""

    def __init__(self):
        self.client = X402DataClient()
        self.min_safety_score = 70  # 最低安全分数 (100 - riskScore)
        self.min_liquidity = 1000000  # 最低流动性 $1M

    def analyze_token(self, token_symbol: str) -> Dict:
        """分析代币并给出交易建议"""
        print(f"\n{'='*50}")
        print(f"📊 开始分析 {token_symbol}")
        print(f"{'='*50}\n")

        # 步骤 1: 获取跨链价格
        price_data = self.client.get_multichain_price(token_symbol)

        print("\n💰 价格分析:")
        for chain, data in price_data["prices"].items():
            print(f"  {chain:10} ${data['price']:,.2f}  (流动性: ${data['liquidity']:,.0f})")

        # 步骤 2: 检查套利机会
        arb = price_data.get("arbitrageOpportunity")
        if arb:
            print(f"\n🎯 套利机会:")
            print(f"  在 {arb['buyChain']} 买入，在 {arb['sellChain']} 卖出")
            print(f"  潜在利润: {arb['potentialProfit']:.2f}%")

        # 步骤 3: 安全检查
        # 假设我们有代币地址
        token_address = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"  # WETH
        safety = self.client.scan_contract_safety(token_address)

        safety_score = 100 - safety["riskScore"]
        print(f"\n🔒 安全分析:")
        print(f"  安全评分: {safety_score}/100")
        print(f"  合约验证: {'✅' if safety['isVerified'] else '❌'}")
        print(f"  蜜罐检测: {'❌ 安全' if not safety['hasHoneypot'] else '⚠️  警告'}")

        if safety["warnings"]:
            print(f"  警告: {', '.join(safety['warnings'])}")

        # 步骤 4: 生成建议
        recommendation = self.generate_recommendation(price_data, safety)

        print(f"\n💡 交易建议:")
        print(f"  {recommendation['action']}")
        print(f"  信心度: {recommendation['confidence']:.0f}%")
        print(f"  理由: {recommendation['reason']}")

        # 计算数据服务费用
        data_cost = 0.001 + 0.02  # multichain_price + safety_scan
        print(f"\n💳 数据服务费用: ${data_cost:.4f}")

        return recommendation

    def generate_recommendation(self, price_data: Dict, safety: Dict) -> Dict:
        """生成交易建议"""
        safety_score = 100 - safety["riskScore"]

        # 检查安全性
        if safety_score < self.min_safety_score:
            return {
                "action": "❌ 不推荐 - 安全分数过低",
                "confidence": 20,
                "reason": f"安全评分 {safety_score}/100 低于最低要求 {self.min_safety_score}",
            }

        if safety["hasHoneypot"]:
            return {
                "action": "❌ 不推荐 - 检测到蜜罐",
                "confidence": 0,
                "reason": "该合约可能是蜜罐骗局",
            }

        # 检查流动性
        min_liquidity = min(
            [data["liquidity"] for data in price_data["prices"].values()]
        )
        if min_liquidity < self.min_liquidity:
            return {
                "action": "⚠️  谨慎 - 流动性不足",
                "confidence": 40,
                "reason": f"最小流动性 ${min_liquidity:,.0f} 低于 ${self.min_liquidity:,.0f}",
            }

        # 检查套利机会
        arb = price_data.get("arbitrageOpportunity")
        if arb and arb["potentialProfit"] > 0.5:
            return {
                "action": f"✅ 推荐 - 套利机会 {arb['buyChain']} → {arb['sellChain']}",
                "confidence": 85,
                "reason": f"价差 {arb['potentialProfit']:.2f}%，安全性良好，流动性充足",
            }

        return {
            "action": "➡️  中性 - 持有或观望",
            "confidence": 60,
            "reason": "无明显套利机会，但代币基本面良好",
        }


def main():
    """主程序"""
    print("🤖 AI Trading Agent 启动\n")

    agent = SimpleTradingAgent()

    # 分析一些热门代币
    tokens = ["WETH", "USDC"]

    for token in tokens:
        try:
            agent.analyze_token(token)
            time.sleep(2)  # 避免请求过快
        except Exception as e:
            print(f"❌ 分析 {token} 时出错: {e}")

    print(f"\n{'='*50}")
    print("✅ 分析完成")
    print(f"{'='*50}\n")


if __name__ == "__main__":
    main()
