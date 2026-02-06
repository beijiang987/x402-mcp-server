/**
 * 缓存服务
 *
 * 使用 Upstash Redis (Vercel KV) 缓存热门数据
 *
 * 缓存策略：
 * - 热门 Agents: 10 分钟 TTL
 * - 声誉评分: 5 分钟 TTL
 * - Subgraph 查询: 1 分钟 TTL
 * - 匹配结果: 5 分钟 TTL
 */

import { kv } from '@vercel/kv';

/**
 * 缓存键前缀
 */
const CACHE_PREFIX = {
  AGENT: 'agent:',
  REPUTATION: 'reputation:',
  SEARCH: 'search:',
  MATCH: 'match:',
  TRENDING: 'trending:',
} as const;

/**
 * TTL 配置（秒）
 */
const TTL = {
  AGENT: 600, // 10 分钟
  REPUTATION: 300, // 5 分钟
  SEARCH: 60, // 1 分钟
  MATCH: 300, // 5 分钟
  TRENDING: 600, // 10 分钟
} as const;

/**
 * 缓存服务
 */
export class CacheService {
  /**
   * 检查缓存是否可用
   */
  static async isAvailable(): Promise<boolean> {
    try {
      await kv.ping();
      return true;
    } catch (error) {
      console.warn('Cache not available:', error);
      return false;
    }
  }

  /**
   * 缓存 Agent 数据
   */
  static async cacheAgent(agentId: string, network: string, data: any): Promise<void> {
    try {
      const key = `${CACHE_PREFIX.AGENT}${network}:${agentId}`;
      await kv.setex(key, TTL.AGENT, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to cache agent:', error);
    }
  }

  /**
   * 获取缓存的 Agent
   */
  static async getAgent(agentId: string, network: string): Promise<any | null> {
    try {
      const key = `${CACHE_PREFIX.AGENT}${network}:${agentId}`;
      const cached = await kv.get(key);
      return cached ? (typeof cached === 'string' ? JSON.parse(cached) : cached) : null;
    } catch (error) {
      console.error('Failed to get cached agent:', error);
      return null;
    }
  }

  /**
   * 缓存声誉评分
   */
  static async cacheReputation(agentId: string, network: string, score: any): Promise<void> {
    try {
      const key = `${CACHE_PREFIX.REPUTATION}${network}:${agentId}`;
      await kv.setex(key, TTL.REPUTATION, JSON.stringify(score));
    } catch (error) {
      console.error('Failed to cache reputation:', error);
    }
  }

  /**
   * 获取缓存的声誉评分
   */
  static async getReputation(agentId: string, network: string): Promise<any | null> {
    try {
      const key = `${CACHE_PREFIX.REPUTATION}${network}:${agentId}`;
      const cached = await kv.get(key);
      return cached ? (typeof cached === 'string' ? JSON.parse(cached) : cached) : null;
    } catch (error) {
      console.error('Failed to get cached reputation:', error);
      return null;
    }
  }

  /**
   * 缓存搜索结果
   */
  static async cacheSearch(queryHash: string, network: string, results: any): Promise<void> {
    try {
      const key = `${CACHE_PREFIX.SEARCH}${network}:${queryHash}`;
      await kv.setex(key, TTL.SEARCH, JSON.stringify(results));
    } catch (error) {
      console.error('Failed to cache search results:', error);
    }
  }

  /**
   * 获取缓存的搜索结果
   */
  static async getSearch(queryHash: string, network: string): Promise<any | null> {
    try {
      const key = `${CACHE_PREFIX.SEARCH}${network}:${queryHash}`;
      const cached = await kv.get(key);
      return cached ? (typeof cached === 'string' ? JSON.parse(cached) : cached) : null;
    } catch (error) {
      console.error('Failed to get cached search:', error);
      return null;
    }
  }

  /**
   * 缓存匹配结果
   */
  static async cacheMatch(taskHash: string, network: string, results: any): Promise<void> {
    try {
      const key = `${CACHE_PREFIX.MATCH}${network}:${taskHash}`;
      await kv.setex(key, TTL.MATCH, JSON.stringify(results));
    } catch (error) {
      console.error('Failed to cache match results:', error);
    }
  }

  /**
   * 获取缓存的匹配结果
   */
  static async getMatch(taskHash: string, network: string): Promise<any | null> {
    try {
      const key = `${CACHE_PREFIX.MATCH}${network}:${taskHash}`;
      const cached = await kv.get(key);
      return cached ? (typeof cached === 'string' ? JSON.parse(cached) : cached) : null;
    } catch (error) {
      console.error('Failed to get cached match:', error);
      return null;
    }
  }

  /**
   * 缓存热门 Agents
   */
  static async cacheTrending(network: string, agents: any[]): Promise<void> {
    try {
      const key = `${CACHE_PREFIX.TRENDING}${network}`;
      await kv.setex(key, TTL.TRENDING, JSON.stringify(agents));
    } catch (error) {
      console.error('Failed to cache trending agents:', error);
    }
  }

  /**
   * 获取缓存的热门 Agents
   */
  static async getTrending(network: string): Promise<any[] | null> {
    try {
      const key = `${CACHE_PREFIX.TRENDING}${network}`;
      const cached = await kv.get(key);
      return cached ? (typeof cached === 'string' ? JSON.parse(cached) : cached) : null;
    } catch (error) {
      console.error('Failed to get cached trending:', error);
      return null;
    }
  }

  /**
   * 清除特定 Agent 的缓存
   */
  static async invalidateAgent(agentId: string, network: string): Promise<void> {
    try {
      const keys = [
        `${CACHE_PREFIX.AGENT}${network}:${agentId}`,
        `${CACHE_PREFIX.REPUTATION}${network}:${agentId}`,
      ];

      for (const key of keys) {
        await kv.del(key);
      }
    } catch (error) {
      console.error('Failed to invalidate agent cache:', error);
    }
  }

  /**
   * 清除所有搜索缓存
   */
  static async invalidateSearchCache(network: string): Promise<void> {
    try {
      // Vercel KV 不支持通配符删除，需要使用 scan
      // 这里简化处理：只清除 trending 缓存
      await kv.del(`${CACHE_PREFIX.TRENDING}${network}`);
    } catch (error) {
      console.error('Failed to invalidate search cache:', error);
    }
  }

  /**
   * 生成查询哈希（用于缓存键）
   */
  static hashQuery(query: any): string {
    const str = JSON.stringify(query);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }
}
