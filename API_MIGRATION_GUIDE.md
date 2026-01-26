# API Migration Guide - RESTful Naming

**Date**: January 26, 2026
**Version**: 2.0

---

## Overview

We've migrated to RESTful API naming conventions to provide a more intuitive and standardized API structure. All endpoints now follow resource-based naming patterns.

## What Changed?

### Old Endpoints → New Endpoints

| Old Endpoint | New Endpoint | Status |
|--------------|--------------|--------|
| `GET /api/x402/token-price` | `GET /api/x402/tokens/price` | ✅ Redirected |
| `GET /api/x402/multichain-price` | `GET /api/x402/tokens/prices/multichain` | ✅ Redirected |
| `GET /api/x402/pool-analytics` | `GET /api/x402/pools/analytics` | ✅ Redirected |
| `GET /api/x402/whale-transactions` | `GET /api/x402/transactions/whales` | ✅ Redirected |
| `GET /api/x402/contract-safety` | `GET /api/x402/contracts/safety` | ✅ Redirected |

---

## Migration Steps

### For Existing Users

**Good News!** Old URLs are automatically redirected to new ones. No immediate action required.

However, we recommend updating to new URLs for better performance and future compatibility:

#### Before (Old URLs):
```bash
curl https://x402-mcp-server.vercel.app/api/x402/token-price?token_address=0x...
curl https://x402-mcp-server.vercel.app/api/x402/multichain-price?token_symbol=WETH
curl https://x402-mcp-server.vercel.app/api/x402/pool-analytics?pool_address=0x...
curl https://x402-mcp-server.vercel.app/api/x402/whale-transactions?token_address=0x...
curl https://x402-mcp-server.vercel.app/api/x402/contract-safety?contract_address=0x...
```

#### After (New URLs):
```bash
curl https://x402-mcp-server.vercel.app/api/x402/tokens/price?token_address=0x...
curl https://x402-mcp-server.vercel.app/api/x402/tokens/prices/multichain?token_symbol=WETH
curl https://x402-mcp-server.vercel.app/api/x402/pools/analytics?pool_address=0x...
curl https://x402-mcp-server.vercel.app/api/x402/transactions/whales?token_address=0x...
curl https://x402-mcp-server.vercel.app/api/x402/contracts/safety?contract_address=0x...
```

---

## Why RESTful Naming?

### Benefits

1. **Resource-Based**: Clear hierarchy (tokens → price, pools → analytics)
2. **Standardized**: Follows REST best practices
3. **Scalable**: Easier to add new endpoints under existing resources
4. **Intuitive**: Self-documenting API structure

### Resource Structure

```
/api/x402/
├── tokens/
│   ├── price                 # Single token price
│   └── prices/
│       └── multichain        # Multi-chain aggregation
├── pools/
│   └── analytics             # Pool metrics
├── transactions/
│   └── whales                # Large transfers
└── contracts/
    └── safety                # Security analysis
```

---

## Backward Compatibility

### Automatic Redirects

Old URLs automatically redirect to new ones via `vercel.json` configuration:

```json
{
  "rewrites": [
    {
      "source": "/api/x402/token-price",
      "destination": "/api/x402/tokens/price"
    },
    ...
  ]
}
```

### HTTP 308 Permanent Redirect

Old endpoints return HTTP 308 status, indicating permanent redirection:

- **Status**: 308 Permanent Redirect
- **Location**: New RESTful URL
- **Cache**: Browsers and clients will cache the redirect

---

## Updated Documentation

### Discovery Document

`.well-known/x402.json` has been updated with new endpoint names:

```json
{
  "endpoints": {
    "GET /api/x402/tokens/price": { ... },
    "GET /api/x402/tokens/prices/multichain": { ... },
    "GET /api/x402/pools/analytics": { ... },
    "GET /api/x402/transactions/whales": { ... },
    "GET /api/x402/contracts/safety": { ... }
  }
}
```

### x402 Response URLs

All HTTP 402 responses now return new URLs in `resource.url` field:

```json
{
  "x402Version": 2,
  "error": "Payment required",
  "resource": {
    "url": "https://x402-mcp-server.vercel.app/api/x402/tokens/price",
    ...
  }
}
```

---

## Code Examples

### JavaScript/TypeScript

```typescript
// Old way (still works)
const oldUrl = 'https://x402-mcp-server.vercel.app/api/x402/token-price';

// New way (recommended)
const newUrl = 'https://x402-mcp-server.vercel.app/api/x402/tokens/price';

const response = await fetch(newUrl + '?token_address=0x...&chain=ethereum');
const data = await response.json();
```

### Python

```python
import requests

# Old way (still works)
old_url = "https://x402-mcp-server.vercel.app/api/x402/token-price"

# New way (recommended)
new_url = "https://x402-mcp-server.vercel.app/api/x402/tokens/price"

params = {"token_address": "0x...", "chain": "ethereum"}
response = requests.get(new_url, params=params)
data = response.json()
```

### cURL

```bash
# Old way (still works)
curl "https://x402-mcp-server.vercel.app/api/x402/token-price?token_address=0x...&chain=ethereum"

# New way (recommended)
curl "https://x402-mcp-server.vercel.app/api/x402/tokens/price?token_address=0x...&chain=ethereum"
```

---

## Migration Checklist

- [ ] Review new endpoint structure
- [ ] Update hardcoded URLs in your application
- [ ] Update API client libraries
- [ ] Update documentation and examples
- [ ] Test all endpoints with new URLs
- [ ] Update monitoring and analytics
- [ ] Notify team members about changes

---

## Deprecation Timeline

### Phase 1: Current (Immediate)
- ✅ New RESTful URLs active
- ✅ Old URLs redirect to new ones
- ✅ No breaking changes

### Phase 2: 3 Months (April 2026)
- Old URLs still work with redirect
- Deprecation warnings in response headers
- `X-Deprecated-Endpoint: true`
- `X-New-Endpoint: <new-url>`

### Phase 3: 6 Months (July 2026)
- Old URLs return HTTP 410 Gone
- Redirect removed
- Must use new URLs

---

## FAQ

### Q: Do I need to update my code immediately?

**A:** No, old URLs will continue to work with automatic redirects. However, we recommend updating to new URLs for better performance and future compatibility.

### Q: Will parameters change?

**A:** No, all query parameters remain the same. Only the URL path has changed.

### Q: Will response format change?

**A:** No, response format remains identical. Only the URL in the `resource.url` field reflects the new endpoint.

### Q: Are there any breaking changes?

**A:** No breaking changes in Phase 1. All old URLs redirect seamlessly to new ones.

### Q: How long will old URLs work?

**A:** Old URLs will redirect for at least 6 months (until July 2026). After that, they will return HTTP 410 Gone.

### Q: What about the discovery document?

**A:** `.well-known/x402.json` has been updated with new endpoint names. x402scan will automatically index the new structure.

---

## Support

If you encounter any issues during migration:

- **GitHub Issues**: https://github.com/beijiang987/x402-mcp-server/issues
- **Email**: support@x402-data.com
- **x402scan**: https://www.x402scan.com

---

## Changelog

### Version 2.0 (January 26, 2026)

**Added**:
- RESTful resource-based endpoint structure
- Automatic redirects for old URLs
- Updated discovery document

**Changed**:
- URL paths follow REST conventions
- Resource hierarchy: tokens/, pools/, transactions/, contracts/

**Deprecated**:
- Old kebab-case endpoint names (still functional via redirects)

**Removed**:
- None (backward compatible)

---

**Thank you for using x402 AI Agent Data Service!**

Questions? Feedback? Let us know!
