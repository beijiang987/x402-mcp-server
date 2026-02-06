/**
 * POST /api/v1/search
 *
 * 标准搜索 API（不同于智能匹配）
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { AgentSearchService } from '../../src/erc8004/agent-search-service.js';
import { CacheService } from '../../src/cache/cache-service.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // 解析参数（支持 POST body 和 GET query）
    const params = req.method === 'POST' ? req.body : req.query;

    const {
      keyword,
      capabilities,
      skills,
      domains,
      minRating,
      minFeedbacks,
      x402Only,
      sortBy = 'relevance',
      sortOrder = 'desc',
      limit = 20,
      offset = 0,
    } = params;

    const network = (process.env.ERC8004_NETWORK || 'sepolia') as 'sepolia' | 'mainnet';

    // 生成缓存键
    const queryHash = CacheService.hashQuery(params);
    const cached = await CacheService.getSearch(queryHash, network);

    if (cached) {
      return res.status(200).json({
        success: true,
        cached: true,
        ...cached,
      });
    }

    // 执行搜索
    const searchService = new AgentSearchService(network);

    const results = await searchService.search({
      keyword,
      capabilities: Array.isArray(capabilities)
        ? capabilities
        : capabilities
        ? capabilities.split(',')
        : undefined,
      skills: Array.isArray(skills) ? skills : skills ? skills.split(',') : undefined,
      domains: Array.isArray(domains) ? domains : domains ? domains.split(',') : undefined,
      minRating: minRating ? parseFloat(minRating) : undefined,
      minFeedbacks: minFeedbacks ? parseInt(minFeedbacks) : undefined,
      x402Only: x402Only === 'true' || x402Only === true,
      sortBy: sortBy as any,
      sortOrder: sortOrder as any,
      limit: parseInt(limit.toString()),
      offset: parseInt(offset.toString()),
    });

    const response = {
      success: true,
      cached: false,
      count: results.length,
      results: results.map((r) => ({
        agentId: r.agent.agentId,
        owner: r.agent.owner,
        name: r.agent.metadata?.name,
        description: r.agent.metadata?.description,
        image: r.agent.metadata?.image,
        capabilities: r.agent.metadata?.capabilities,
        skills: r.agent.metadata?.skills,
        domains: r.agent.metadata?.domains,
        x402Support: r.agent.metadata?.x402Support,
        relevanceScore: r.score,
        reputation: r.reputation,
      })),
    };

    // 缓存结果
    await CacheService.cacheSearch(queryHash, network, response);

    return res.status(200).json(response);
  } catch (error: any) {
    console.error('Search API error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
    });
  }
}
