/**
 * V1 API - Smart Match & Reputation
 *
 * Routes (via vercel.json rewrites):
 *   POST /api/v1/match - AI-powered agent matching
 *   GET  /api/v1/reputation/:network/:agentId - Four-dimension reputation scoring
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { GraphQLClient } from 'graphql-request';

// Subgraph URLs
const SUBGRAPH_URLS: Record<string, string> = {
      sepolia: 'https://gateway.thegraph.com/api/00a452ad3cd1900273ea62c1bf283f93/subgraphs/id/6wQRC7geo9XYAhckfmfo8kbMRLeWU8KQd3XsJqPxJYWt',
      mainnet: 'https://gateway.thegraph.com/api/7fd2e7d89ce3ef24cd0d4590298f0b2c/subgraphs/id/FV6RR6y13rsnCxBAicKuQEwDp8ioEGiNaWaZUmP2VJcz',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const route = req.query.route as string;

  try {
          if (route === 'match') {
                    return handleMatch(req, res);
          } else if (route === 'reputation') {
                    return handleReputation(req, res);
          } else {
                    return res.status(400).json({
                                error: 'Unknown route',
                                usage: { match: 'POST /api/v1/match', reputation: 'GET /api/v1/reputation/:network/:agentId' }
                    });
          }
  } catch (error: any) {
          console.error('V1 API error:', error);
          return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}

// ==================== MATCH ====================

async function handleMatch(req: VercelRequest, res: VercelResponse) {
      if (req.method !== 'POST') {
              return res.status(405).json({ error: 'Method not allowed, use POST' });
      }

  const { task, limit = 5 } = req.body || {};
      if (!task) {
              return res.status(400).json({ error: 'Missing "task" in request body' });
      }

  // Step 1: Analyze the task (Claude with fallback to enhanced keyword analysis)
  const taskUnderstanding = await analyzeTaskWithClaude(task);

  // Step 2: Fetch agents from subgraph
  const agents = await fetchAgentsFromSubgraph('sepolia');

  // Step 3: Score and rank agents
  const scoredAgents = agents.map((agent: any) => ({
          ...agent,
          matchScore: calculateMatchScore(agent, taskUnderstanding),
  }));

  scoredAgents.sort((a: any, b: any) => b.matchScore - a.matchScore);
      const topAgents = scoredAgents.slice(0, Number(limit));

  return res.status(200).json({
          task,
          taskUnderstanding,
          matches: topAgents,
          totalAgentsScanned: agents.length,
          timestamp: new Date().toISOString(),
  });
}

async function analyzeTaskWithClaude(task: string) {
      const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
          console.log('No ANTHROPIC_API_KEY, using enhanced keyword analysis');
          return keywordAnalysis(task);
  }

  try {
          const response = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: {
                                'Content-Type': 'application/json',
                                'x-api-key': apiKey,
                                'anthropic-version': '2023-06-01',
                    },
                    body: JSON.stringify({
                                model: 'claude-3-haiku-20240307',
                                max_tokens: 500,
                                messages: [{
                                              role: 'user',
                                              content: `Analyze this AI agent task request and extract structured information. Return ONLY valid JSON, no markdown.

                                              Task: "${task}"

                                              Return JSON with:
                                              {
                                                "summary": "brief English summary of what the user needs",
                                                  "domains": ["list of relevant domains like blockchain, defi, data-analysis, trading, nft, security, monitoring"],
                                                    "capabilities": ["specific capabilities needed like whale-tracking, tvl-monitoring, price-analysis"],
                                                      "keywords": ["key terms for matching"],
                                                        "complexity": "low|medium|high"
                                                        }`
                                }],
                    }),
          });

        if (!response.ok) {
                  const errBody = await response.text();
                  console.error('Claude API error:', response.status, errBody);
                  console.log('Falling back to enhanced keyword analysis');
                  return keywordAnalysis(task);
        }

        const data = await response.json() as any;
          const text = data.content?.[0]?.text || '';

        try {
                  return JSON.parse(text);
        } catch {
                  const jsonMatch = text.match(/\{[\s\S]*\}/);
                  if (jsonMatch) return JSON.parse(jsonMatch[0]);
                  return keywordAnalysis(task);
        }
  } catch (error) {
          console.error('Claude API call failed:', error);
          return keywordAnalysis(task);
  }
}

function keywordAnalysis(task: string) {
      const lower = task.toLowerCase();
      const domains: string[] = [];
      const capabilities: string[] = [];
      const keywords: string[] = [];

  // Enhanced domain detection - English + Chinese
  const domainMap: Record<string, string[]> = {
          'blockchain': ['blockchain', 'chain', 'block', 'crypto', 'web3', 'onchain', 'on-chain',
                               '\u533a\u5757\u94fe', '\u94fe\u4e0a', '\u52a0\u5bc6', '\u5e01', '\u94b1\u5305', '\u5730\u5740', '\u4ea4\u6613', '\u8f6c\u8d26',
                               '\u4ee5\u592a\u574a', 'ethereum', 'eth', 'bitcoin', 'btc', '\u6bd4\u7279\u5e01',
                               '\u5408\u7ea6', 'contract', '\u77ff\u5de5', 'miner', 'gas', '\u54c8\u5e0c'],
          'defi': ['defi', 'swap', 'liquidity', 'yield', 'tvl', 'protocol', 'amm', 'lending',
                         '\u53bb\u4e2d\u5fc3\u5316', '\u6d41\u52a8\u6027', '\u8d37\u6b3e', '\u501f\u8d37', '\u8d28\u62bc',
                         '\u6536\u76ca', '\u6316\u77ff', '\u7a33\u5b9a\u5e01', 'staking', '\u8d28\u62bc'],
          'data-analysis': ['analysis', 'analyze', 'monitor', 'track', 'data', 'analytics', 'statistics',
                                  '\u5206\u6790', '\u76d1\u63a7', '\u8ddf\u8e2a', '\u6570\u636e', '\u7edf\u8ba1', '\u62a5\u544a', '\u53ef\u89c6\u5316',
                                  '\u884c\u4e3a', '\u6a21\u5f0f', '\u6307\u6807', '\u8d8b\u52bf'],
          'trading': ['trade', 'trading', 'price', 'market', 'exchange', 'arbitrage',
                            '\u4ea4\u6613', '\u4ef7\u683c', '\u5e02\u573a', '\u5151\u6362', '\u5957\u5229', '\u4e70\u5356',
                            '\u5e01\u5b89', '\u4ea4\u6613\u6240', '\u6302\u5355', '\u5e01\u4ef7'],
          'nft': ['nft', 'collectible', 'opensea', 'mint', '\u85cf\u54c1', '\u94f8\u9020', '\u6570\u5b57\u85cf\u54c1'],
          'security': ['security', 'audit', 'vulnerability', 'safe', 'risk', 'scam',
                             '\u5b89\u5168', '\u5ba1\u8ba1', '\u6f0f\u6d1e', '\u98ce\u9669', '\u9a97\u5c40', '\u94d3\u9c7c'],
          'monitoring': ['monitor', 'alert', 'watch', 'real-time', 'realtime', 'notification',
                               '\u76d1\u63a7', '\u8b66\u62a5', '\u5b9e\u65f6', '\u901a\u77e5', '\u9884\u8b66', '\u76d1\u6d4b'],
          'finance': ['finance', 'financial', 'fund', 'invest', 'portfolio',
                            '\u91d1\u878d', '\u8d44\u4ea7', '\u6295\u8d44', '\u57fa\u91d1', '\u7ec4\u5408', '\u8d22\u52a1'],
  };

  for (const [domain, terms] of Object.entries(domainMap)) {
          if (terms.some(t => lower.includes(t))) domains.push(domain);
  }

  // Enhanced capability detection - English + Chinese
  const capMap: Record<string, string[]> = {
          'whale-tracking': ['whale', 'large transaction', 'big wallet', '\u9cb8\u9c7c', '\u5927\u6237', '\u5927\u989d', '\u5de8\u9cb8'],
          'tvl-monitoring': ['tvl', 'total value locked', '\u9501\u4ed3\u91cf', '\u603b\u9501\u5b9a'],
          'price-analysis': ['price', 'pricing', 'valuation', '\u4ef7\u683c', '\u4f30\u503c', '\u5e01\u4ef7'],
          'transaction-analysis': ['transaction', 'transfer', 'tx', '\u4ea4\u6613', '\u8f6c\u8d26', '\u8f6c\u5e01'],
          'wallet-analysis': ['wallet', 'address', 'portfolio', '\u94b1\u5305', '\u5730\u5740', '\u8d26\u6237'],
          'smart-contract-analysis': ['contract', 'solidity', 'bytecode', '\u5408\u7ea6', '\u667a\u80fd\u5408\u7ea6'],
          'behavior-analysis': ['behavior', 'pattern', 'activity', '\u884c\u4e3a', '\u6a21\u5f0f', '\u6d3b\u52a8'],
          'risk-assessment': ['risk', 'danger', 'threat', '\u98ce\u9669', '\u5a01\u80c1', '\u8bc4\u4f30'],
  };

  for (const [cap, terms] of Object.entries(capMap)) {
          if (terms.some(t => lower.includes(t))) capabilities.push(cap);
  }

  // Extract meaningful keywords - handle both English and Chinese
  const stopwords = new Set(['i', 'a', 'an', 'the', 'that', 'can', 'need', 'find', 'want', 'able',
                                 'to', 'in', 'of', 'for', 'and', 'or', 'is', 'it', 'me', 'my',
                                 '\u6211', '\u9700\u8981', '\u4e00\u4e2a', '\u80fd', '\u7684', '\u548c', '\u662f', '\u5728', '\u4e86', '\u4e0d']);

  // For Chinese text, extract 2-4 character terms
  const chineseTerms = task.match(/[\u4e00-\u9fff]{2,4}/g) || [];
      const englishWords = task.replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 2 && !stopwords.has(w.toLowerCase()));
      keywords.push(...chineseTerms.slice(0, 8), ...englishWords.slice(0, 5));

  if (domains.length === 0) domains.push('general');

  const complexity = capabilities.length > 2 ? 'high' : capabilities.length > 0 ? 'medium' : 'low';

  return {
          summary: task.substring(0, 100),
          intent: generateIntent(domains, capabilities),
          domains,
          capabilities,
          keywords,
          complexity,
          analysisMethod: 'enhanced-keyword'
  };
}

function generateIntent(domains: string[], capabilities: string[]) {
      const parts: string[] = [];
      if (domains.length > 0 && domains[0] !== 'general') {
              parts.push(`Domain focus: ${domains.join(', ')}`);
      }
      if (capabilities.length > 0) {
              parts.push(`Capabilities needed: ${capabilities.join(', ')}`);
      }
      return parts.length > 0 ? parts.join('. ') : 'General AI agent task';
}

async function fetchAgentsFromSubgraph(network: string) {
      const url = SUBGRAPH_URLS[network];
      if (!url) return [];

  try {
          const client = new GraphQLClient(url);
          const query = `{
                agents(first: 100, orderBy: createdAt, orderDirection: desc) {
                        id
                                agentId
                                        owner
                                                agentURI
                                                        createdAt
                                                              }
                                                                  }`;

        const data = await client.request<{ agents: any[] }>(query);
          const agents = data.agents || [];

        return await Promise.all(agents.map(async (agent: any) => {
                  const metadata = await fetchAgentMetadata(agent.agentURI);
                  return { ...agent, metadata };
        }));
  } catch (error) {
          console.error('Subgraph fetch error:', error);
          return [];
  }
}

async function fetchAgentMetadata(uri: string) {
      if (!uri) return null;
      try {
              let fetchUrl = uri;
              if (uri.startsWith('ipfs://')) {
                        fetchUrl = `https://ipfs.io/ipfs/${uri.replace('ipfs://', '')}`;
              }
              const response = await fetch(fetchUrl, { signal: AbortSignal.timeout(5000) });
              if (!response.ok) return null;
              return await response.json();
      } catch {
              return null;
      }
}

function calculateMatchScore(agent: any, understanding: any) {
      let score = 0;
      const meta = agent.metadata;

  if (!meta) return 10;

  const agentText = JSON.stringify(meta).toLowerCase();

  // Domain match (40 points max)
  const domains = understanding.domains || [];
      const domainMatches = domains.filter((d: string) => agentText.includes(d.toLowerCase()));
      score += Math.min(domainMatches.length * 15, 40);

  // Capability match (30 points max)
  const capabilities = understanding.capabilities || [];
      const capMatches = capabilities.filter((c: string) =>
              agentText.includes(c.toLowerCase().replace(/-/g, ''))
                                               );
      score += Math.min(capMatches.length * 15, 30);

  // Keyword match (20 points max)
  const keywords = understanding.keywords || [];
      const kwMatches = keywords.filter((k: string) => agentText.includes(k.toLowerCase()));
      score += Math.min(kwMatches.length * 5, 20);

  // x402 support bonus (10 points)
  if (meta.x402Support || agentText.includes('x402') || agentText.includes('payment')) {
          score += 10;
  }

  return Math.min(score, 100);
}

// ==================== REPUTATION ====================

async function handleReputation(req: VercelRequest, res: VercelResponse) {
      if (req.method !== 'GET') {
              return res.status(405).json({ error: 'Method not allowed, use GET' });
      }

  const network = req.query.network as string || 'sepolia';
      const agentId = req.query.agentId as string;

  if (!agentId) {
          return res.status(400).json({ error: 'Missing agentId parameter' });
  }

  const url = SUBGRAPH_URLS[network];
      if (!url) {
              return res.status(400).json({
                        error: `Unsupported network: ${network}`,
                        supported: Object.keys(SUBGRAPH_URLS)
              });
      }

  const client = new GraphQLClient(url);

  const feedbackQuery = `
      query GetFeedbacks($agentId: String!) {
            feedbacks(where: { agentId: $agentId, revoked: false }, orderBy: createdAt, orderDirection: desc) {
                    id agentId clientAddress value valueDecimals tag1 tag2 createdAt revoked
                          }
                              }
                                `;

  let feedbacks: any[] = [];
      try {
              const data = await client.request<{ feedbacks: any[] }>(feedbackQuery, { agentId });
              feedbacks = data.feedbacks || [];
      } catch (error) {
              console.error('Feedback fetch error:', error);
      }

  const agentQuery = `
      query GetAgent($agentId: String!) {
            agents(where: { agentId: $agentId }) {
                    id agentId owner agentURI createdAt
                          }
                              }
                                `;

  let agentInfo: any = null;
      try {
              const data = await client.request<{ agents: any[] }>(agentQuery, { agentId });
              agentInfo = data.agents?.[0] || null;
      } catch (error) {
              console.error('Agent fetch error:', error);
      }

  const reputation = calculateFourDimensionReputation(feedbacks, agentId);

  return res.status(200).json({
          agentId,
          network,
          agent: agentInfo,
          reputation,
          feedbackCount: feedbacks.length,
          timestamp: new Date().toISOString(),
  });
}

function calculateFourDimensionReputation(feedbacks: any[], agentId: string) {
      if (feedbacks.length === 0) {
              console.log(`Agent ${agentId} has no feedback data, using fallback scoring`);
              return {
                        overall: 50,
                        breakdown: {
                                    reliability: { score: 50, description: 'No data - default score' },
                                    quality: { score: 50, description: 'No data - default score' },
                                    responsiveness: { score: 50, description: 'No data - default score' },
                                    trustworthiness: { score: 50, description: 'No data - default score' },
                        },
                        dataStatus: 'no-feedback-data',
                        note: 'Agent has no tag data, fallback scoring applied',
              };
      }

  const now = Date.now() / 1000;
      const THIRTY_DAYS = 30 * 24 * 3600;

  const scores = feedbacks.map(f => {
          const rawValue = Number(f.value);
          const decimals = Number(f.valueDecimals) || 0;
          const numericScore = decimals > 0 ? rawValue / Math.pow(10, decimals) : rawValue;
          const age = now - Number(f.createdAt);
          const timeWeight = Math.max(0.3, 1 - (age / (365 * 24 * 3600)));
          return { ...f, numericScore: Math.min(numericScore, 100), timeWeight, age };
  });

  const allScores = scores.map(s => s.numericScore);
      const avgScore = allScores.reduce((a, b) => a + b, 0) / allScores.length;
      const variance = allScores.reduce((sum, s) => sum + Math.pow(s - avgScore, 2), 0) / allScores.length;
      const stdDev = Math.sqrt(variance);
      const reliability = Math.max(0, Math.min(100, avgScore * (1 - stdDev / 100)));

  const weightedSum = scores.reduce((sum, s) => sum + s.numericScore * s.timeWeight, 0);
      const weightTotal = scores.reduce((sum, s) => sum + s.timeWeight, 0);
      const quality = weightTotal > 0 ? Math.min(100, weightedSum / weightTotal) : 50;

  const recentFeedbacks = scores.filter(s => s.age < THIRTY_DAYS);
      const recentRatio = recentFeedbacks.length / Math.max(scores.length, 1);
      const recentAvg = recentFeedbacks.length > 0
        ? recentFeedbacks.reduce((sum, s) => sum + s.numericScore, 0) / recentFeedbacks.length
              : avgScore * 0.8;
      const responsiveness = Math.min(100, recentAvg * (0.5 + 0.5 * recentRatio));

  const uniqueClients = new Set(feedbacks.map(f => f.clientAddress)).size;
      const sybilRisk = uniqueClients < 2 ? 0.8 : uniqueClients < 5 ? 0.5 : uniqueClients < 10 ? 0.2 : 0;
      const clientDiversityBonus = Math.min(20, uniqueClients * 3);
      const trustworthiness = Math.min(100, avgScore * (1 - sybilRisk * 0.3) + clientDiversityBonus);

  const overall = Math.round((reliability * 0.25 + quality * 0.30 + responsiveness * 0.20 + trustworthiness * 0.25) * 10) / 10;

  const tagScores: Record<string, { total: number; count: number }> = {};
      for (const f of feedbacks) {
              for (const tag of [f.tag1, f.tag2].filter(Boolean)) {
                        if (!tagScores[tag]) tagScores[tag] = { total: 0, count: 0 };
                        const s = scores.find(sc => sc.id === f.id);
                        if (s) {
                                    tagScores[tag].total += s.numericScore;
                                    tagScores[tag].count++;
                        }
              }
      }

  const scoresByTag: Record<string, { average: number; count: number }> = {};
      for (const [tag, data] of Object.entries(tagScores)) {
              scoresByTag[tag] = {
                        average: Math.round(data.total / data.count * 10) / 10,
                        count: data.count
              };
      }

  return {
          overall,
          breakdown: {
                    reliability: {
                                score: Math.round(reliability * 10) / 10,
                                description: `Consistency across ${allScores.length} feedbacks, stdDev=${stdDev.toFixed(1)}`
                    },
                    quality: {
                                score: Math.round(quality * 10) / 10,
                                description: `Time-weighted quality score from ${scores.length} feedbacks`
                    },
                    responsiveness: {
                                score: Math.round(responsiveness * 10) / 10,
                                description: `${recentFeedbacks.length} recent feedbacks in 30 days`
                    },
                    trustworthiness: {
                                score: Math.round(trustworthiness * 10) / 10,
                                description: `${uniqueClients} unique clients, sybilRisk=${sybilRisk}`
                    },
          },
          scoresByTag,
          dataStatus: 'live',
          uniqueClients,
          sybilRisk,
  };
}
