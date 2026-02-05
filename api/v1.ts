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

  // Route based on query param "route"
  const route = req.query.route as string;

  try {
        if (route === 'match') {
                return handleMatch(req, res);
        } else if (route === 'reputation') {
                return handleReputation(req, res);
        } else {
                return res.status(400).json({ error: 'Unknown route', usage: { match: 'POST /api/v1/match', reputation: 'GET /api/v1/reputation/:network/:agentId' } });
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

  // Step 1: Use Claude to understand the task
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
        console.log('No ANTHROPIC_API_KEY, using keyword-based analysis');
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
                          model: 'claude-3-5-sonnet-20241022',
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
              console.error('Claude API error:', response.status);
              return keywordAnalysis(task);
      }

      const data = await response.json() as any;
        const text = data.content?.[0]?.text || '';

      try {
              return JSON.parse(text);
      } catch {
              // Try extracting JSON from the response
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

  // Domain detection
  const domainMap: Record<string, string[]> = {
        'blockchain': ['blockchain', 'chain', 'block', 'crypto', 'web3', 'onchain', 'on-chain'],
        'defi': ['defi', 'swap', 'liquidity', 'yield', 'tvl', 'protocol', 'amm', 'lending'],
        'data-analysis': ['analysis', 'analyze', 'monitor', 'track', 'data', 'analytics', 'statistics'],
        'trading': ['trade', 'trading', 'price', 'market', 'exchange', 'arbitrage'],
        'nft': ['nft', 'collectible', 'opensea', 'mint'],
        'security': ['security', 'audit', 'vulnerability', 'safe', 'risk', 'scam'],
        'monitoring': ['monitor', 'alert', 'watch', 'real-time', 'realtime', 'notification'],
  };

  for (const [domain, terms] of Object.entries(domainMap)) {
        if (terms.some(t => lower.includes(t))) domains.push(domain);
  }

  // Capability detection
  const capMap: Record<string, string[]> = {
        'whale-tracking': ['whale', 'large transaction', 'big wallet'],
        'tvl-monitoring': ['tvl', 'total value locked'],
        'price-analysis': ['price', 'pricing', 'valuation'],
        'transaction-analysis': ['transaction', 'transfer', 'tx'],
        'wallet-analysis': ['wallet', 'address', 'portfolio'],
        'smart-contract-analysis': ['contract', 'solidity', 'bytecode'],
  };

  for (const [cap, terms] of Object.entries(capMap)) {
        if (terms.some(t => lower.includes(t))) capabilities.push(cap);
  }

  // Extract meaningful keywords
  const stopwords = new Set(['i', 'a', 'an', 'the', 'that', 'can', 'need', 'find', 'want', 'able', 'to', 'in', 'of', 'for', 'and', 'or', 'is', 'it', 'me', 'my']);
    const words = task.replace(/[^\w\s\u4e00-\u9fff]/g, '').split(/\s+/).filter(w => w.length > 2 && !stopwords.has(w.toLowerCase()));
    keywords.push(...words.slice(0, 10));

  if (domains.length === 0) domains.push('general');
    const complexity = capabilities.length > 2 ? 'high' : capabilities.length > 0 ? 'medium' : 'low';

  return { summary: task.substring(0, 100), domains, capabilities, keywords, complexity };
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

      // Enrich with metadata
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
          // Handle IPFS URIs
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
    if (!meta) return 10; // Base score for agents without metadata

  const agentText = JSON.stringify(meta).toLowerCase();

  // Domain match (40 points max)
  const domains = understanding.domains || [];
    const domainMatches = domains.filter((d: string) => agentText.includes(d.toLowerCase()));
    score += Math.min(domainMatches.length * 15, 40);

  // Capability match (30 points max)
  const capabilities = understanding.capabilities || [];
    const capMatches = capabilities.filter((c: string) => agentText.includes(c.toLowerCase().replace('-', '')));
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
          return res.status(400).json({ error: `Unsupported network: ${network}`, supported: Object.keys(SUBGRAPH_URLS) });
    }

  const client = new GraphQLClient(url);

  // Fetch feedbacks for this agent
  const feedbackQuery = `
      query GetFeedbacks($agentId: String!) {
            feedbacks(where: { agentId: $agentId, revoked: false }, orderBy: createdAt, orderDirection: desc) {
                    id
                            agentId
                                    clientAddress
                                            value
                                                    valueDecimals
                                                            tag1
                                                                    tag2
                                                                            createdAt
                                                                                    revoked
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

  // Also fetch agent info
  const agentQuery = `
      query GetAgent($agentId: String!) {
            agents(where: { agentId: $agentId }) {
                    id
                            agentId
                                    owner
                                            agentURI
                                                    createdAt
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

  // Calculate four-dimension reputation
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

  // Parse scores from feedbacks
  const scores = feedbacks.map(f => {
        const rawValue = Number(f.value);
        const decimals = Number(f.valueDecimals) || 0;
        const numericScore = decimals > 0 ? rawValue / Math.pow(10, decimals) : rawValue;
        const age = now - Number(f.createdAt);
        const timeWeight = Math.max(0.3, 1 - (age / (365 * 24 * 3600)));
        return { ...f, numericScore: Math.min(numericScore, 100), timeWeight, age };
  });

  // Dimension 1: Reliability - consistency of scores
  const allScores = scores.map(s => s.numericScore);
    const avgScore = allScores.reduce((a, b) => a + b, 0) / allScores.length;
    const variance = allScores.reduce((sum, s) => sum + Math.pow(s - avgScore, 2), 0) / allScores.length;
    const stdDev = Math.sqrt(variance);
    const reliability = Math.max(0, Math.min(100, avgScore * (1 - stdDev / 100)));

  // Dimension 2: Quality - weighted average with time decay
  const weightedSum = scores.reduce((sum, s) => sum + s.numericScore * s.timeWeight, 0);
    const weightTotal = scores.reduce((sum, s) => sum + s.timeWeight, 0);
    const quality = weightTotal > 0 ? Math.min(100, weightedSum / weightTotal) : 50;

  // Dimension 3: Responsiveness - recent activity and frequency
  const recentFeedbacks = scores.filter(s => s.age < THIRTY_DAYS);
    const recentRatio = recentFeedbacks.length / Math.max(scores.length, 1);
    const recentAvg = recentFeedbacks.length > 0
      ? recentFeedbacks.reduce((sum, s) => sum + s.numericScore, 0) / recentFeedbacks.length
          : avgScore * 0.8;
    const responsiveness = Math.min(100, recentAvg * (0.5 + 0.5 * recentRatio));

  // Dimension 4: Trustworthiness - unique clients & anti-sybil
  const uniqueClients = new Set(feedbacks.map(f => f.clientAddress)).size;
    const sybilRisk = uniqueClients < 2 ? 0.8 : uniqueClients < 5 ? 0.5 : uniqueClients < 10 ? 0.2 : 0;
    const clientDiversityBonus = Math.min(20, uniqueClients * 3);
    const trustworthiness = Math.min(100, avgScore * (1 - sybilRisk * 0.3) + clientDiversityBonus);

  // Overall score
  const overall = Math.round((reliability * 0.25 + quality * 0.30 + responsiveness * 0.20 + trustworthiness * 0.25) * 10) / 10;

  // Tag-based breakdown
  const tagScores: Record<string, { total: number; count: number }> = {};
    for (const f of feedbacks) {
          for (const tag of [f.tag1, f.tag2].filter(Boolean)) {
                  if (!tagScores[tag]) tagScores[tag] = { total: 0, count: 0 };
                  const s = scores.find(sc => sc.id === f.id);
                  if (s) { tagScores[tag].total += s.numericScore; tagScores[tag].count++; }
          }
    }

  const scoresByTag: Record<string, { average: number; count: number }> = {};
    for (const [tag, data] of Object.entries(tagScores)) {
          scoresByTag[tag] = { average: Math.round(data.total / data.count * 10) / 10, count: data.count };
    }

  return {
        overall,
        breakdown: {
                reliability: { score: Math.round(reliability * 10) / 10, description: `Consistency across ${allScores.length} feedbacks, stdDev=${stdDev.toFixed(1)}` },
                quality: { score: Math.round(quality * 10) / 10, description: `Time-weighted quality score from ${scores.length} feedbacks` },
                responsiveness: { score: Math.round(responsiveness * 10) / 10, description: `${recentFeedbacks.length} recent feedbacks in 30 days` },
                trustworthiness: { score: Math.round(trustworthiness * 10) / 10, description: `${uniqueClients} unique clients, sybilRisk=${sybilRisk}` },
        },
        scoresByTag,
        dataStatus: 'live',
        uniqueClients,
        sybilRisk,
  };
}
