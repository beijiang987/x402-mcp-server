# x402 MCP Server 使用示例

## 场景 1: 为 API 端点添加付费访问

假设你有一个天气 API，想要对高级功能收费。

### 1. 创建支付请求

当用户尝试访问付费端点时，使用 `create_payment_request` 工具：

```json
{
  "tool": "create_payment_request",
  "arguments": {
    "resource_path": "/api/weather/premium",
    "amount": "0.0001",
    "currency": "ETH",
    "description": "Premium weather forecast with 14-day prediction",
    "networks": ["base", "ethereum"]
  }
}
```

### 2. 返回给用户的响应

```json
{
  "status": 402,
  "statusText": "Payment Required",
  "headers": {
    "X-Accept-Payment": "base,ethereum",
    "X-Payment-Amount": "0.0001",
    "X-Payment-Currency": "ETH",
    "X-Payment-Description": "Premium weather forecast with 14-day prediction"
  },
  "body": {
    "error": "Payment Required",
    "message": "Payment of 0.0001 ETH required to access /api/weather/premium",
    "payment": {
      "amount": "0.0001",
      "currency": "ETH",
      "networks": ["base", "ethereum"],
      "description": "Premium weather forecast with 14-day prediction",
      "paymentAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
    },
    "instructions": {
      "step1": "Sign a payment transaction using one of the supported networks",
      "step2": "Include the payment signature in the X-Payment-Signature header",
      "step3": "Retry the request with the payment proof"
    }
  }
}
```

### 3. 用户支付后验证

用户完成支付后，验证支付签名：

```json
{
  "tool": "verify_payment",
  "arguments": {
    "payment_signature": "eyJ0eCI6IjB4MTIzLi4uIiwic2lnIjoiMHhhYmMuLi4ifQ==",
    "resource_path": "/api/weather/premium",
    "expected_amount": "0.0001"
  }
}
```

### 4. 验证结果

```json
{
  "valid": true,
  "transactionHash": "0x123abc456def...",
  "payer": "0x1234567890abcdef...",
  "amount": "0.0001",
  "timestamp": 1704067200000
}
```

## 场景 2: AI Agent 自动支付

AI 代理可以自动完成整个支付流程。

### 对话示例

**用户**: "帮我获取未来 14 天的详细天气预报"

**AI**:
1. 尝试访问 `/api/weather/premium`
2. 收到 402 状态码和支付要求
3. 使用 `create_payment_request` 了解支付详情
4. 自动签署支付交易（如果配置了钱包）
5. 使用 `verify_payment` 确认支付
6. 获取并返回天气数据

**AI 响应**: "我已经完成支付（0.0001 ETH），这是未来 14 天的详细天气预报..."

## 场景 3: 监控支付状态

检查特定交易的确认状态：

```json
{
  "tool": "check_payment_status",
  "arguments": {
    "transaction_hash": "0x123abc456def789...",
    "network": "base"
  }
}
```

### 响应示例

```json
{
  "confirmed": true,
  "transactionHash": "0x123abc456def789...",
  "network": "base",
  "blockNumber": 12345678,
  "confirmations": 15
}
```

## 场景 4: 查看所有付费配置

列出所有已配置的付费端点：

```json
{
  "tool": "list_payment_configs"
}
```

### 响应示例

```json
[
  {
    "path": "/api/weather/premium",
    "amount": "0.0001",
    "currency": "ETH",
    "description": "Premium weather forecast with 14-day prediction",
    "networks": ["base", "ethereum"]
  },
  {
    "path": "/api/data/analytics",
    "amount": "0.0005",
    "currency": "USDC",
    "description": "Advanced analytics dashboard",
    "networks": ["base", "polygon"]
  }
]
```

## 实际集成示例

### Express.js 中间件集成

```javascript
import express from 'express';
import { X402PaymentService } from './payment-service.js';

const app = express();
const paymentService = new X402PaymentService();

// x402 支付中间件
async function x402Middleware(req, res, next) {
  const paymentSig = req.headers['x-payment-signature'];

  // 检查该路由是否需要支付
  const config = await paymentService.getConfig(req.path);
  if (!config) {
    return next(); // 不需要支付，继续
  }

  // 如果没有支付签名，返回 402
  if (!paymentSig) {
    const paymentRequest = await paymentService.createPaymentRequest({
      resourcePath: req.path,
      ...config
    });
    return res.status(402).json(paymentRequest.body);
  }

  // 验证支付
  const verification = await paymentService.verifyPayment(
    paymentSig,
    req.path,
    config.amount
  );

  if (!verification.valid) {
    return res.status(402).json({
      error: 'Invalid payment',
      message: verification.error
    });
  }

  // 支付有效，继续处理请求
  req.payment = verification;
  next();
}

// 应用中间件到需要付费的路由
app.get('/api/weather/premium', x402Middleware, (req, res) => {
  res.json({
    forecast: '14-day premium weather data...',
    payment: req.payment
  });
});
```

### Python FastAPI 集成

```python
from fastapi import FastAPI, Header, HTTPException
from x402 import PaymentService

app = FastAPI()
payment_service = PaymentService()

@app.get("/api/weather/premium")
async def premium_weather(x_payment_signature: str = Header(None)):
    config = {
        "amount": "0.0001",
        "currency": "ETH",
        "description": "Premium weather forecast"
    }

    # 如果没有支付签名
    if not x_payment_signature:
        payment_request = payment_service.create_payment_request(
            resource_path="/api/weather/premium",
            **config
        )
        raise HTTPException(status_code=402, detail=payment_request)

    # 验证支付
    verification = payment_service.verify_payment(
        payment_signature=x_payment_signature,
        resource_path="/api/weather/premium",
        expected_amount=config["amount"]
    )

    if not verification["valid"]:
        raise HTTPException(status_code=402, detail=verification["error"])

    # 返回付费内容
    return {
        "forecast": "14-day premium weather data...",
        "payment": verification
    }
```

## 测试技巧

### 使用 curl 测试

```bash
# 1. 请求付费资源（应返回 402）
curl -i http://localhost:3000/api/weather/premium

# 2. 带支付签名的请求
curl -i http://localhost:3000/api/weather/premium \
  -H "X-Payment-Signature: your_payment_signature_here"
```

### 使用 MCP Inspector 测试

```bash
# 安装 MCP Inspector
npm install -g @modelcontextprotocol/inspector

# 运行检查器
mcp-inspector node dist/index.js
```

## 常见问题

### Q: 如何生成支付签名？

A: 支付签名通常由钱包客户端生成，包含交易哈希和签名。x402 SDK 提供了工具函数来创建这些签名。

### Q: 支持哪些区块链网络？

A: 目前支持 Ethereum、Base、Polygon 等 EVM 兼容链，以及 Solana 等其他网络。

### Q: 如何设置不同的支付金额？

A: 在创建支付请求时指定 `amount` 参数即可。金额以代币的最小单位表示（如 ETH 的 Wei）。

### Q: 可以使用稳定币吗？

A: 可以！设置 `currency` 为 "USDC"、"USDT" 或其他支持的稳定币。

---

更多信息请访问 [x402 官方文档](https://docs.x402.org)
