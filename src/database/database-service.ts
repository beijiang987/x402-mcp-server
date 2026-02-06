/**
 * 数据库服务
 *
 * 功能：
 * - 连接 PostgreSQL（推荐使用 Supabase）
 * - CRUD 操作
 * - 数据同步
 * - 查询优化
 */

import { Pool, type PoolConfig } from 'pg';

/**
 * Agent 数据（数据库模型）
 */
export interface AgentDB {
  id?: number;
  agent_id: string;
  owner_address: string;
  agent_uri: string;
  network: string;
  name?: string;
  description?: string;
  image?: string;
  domains?: string[];
  skills?: string[];
  capabilities?: string[];
  services?: any;
  x402_support?: boolean;
  created_at: Date;
  indexed_at?: Date;
  updated_at?: Date;
}

/**
 * Feedback 数据（数据库模型）
 */
export interface FeedbackDB {
  id?: number;
  feedback_id: string;
  agent_id: string;
  client_address: string;
  network: string;
  value: string; // bigint as string
  value_decimals: number;
  numeric_score?: number;
  tag1?: string;
  tag2?: string;
  endpoint?: string;
  data_uri?: string;
  revoked: boolean;
  created_at: Date;
  indexed_at?: Date;
}

/**
 * Reputation Score 数据（数据库模型）
 */
export interface ReputationScoreDB {
  id?: number;
  agent_id: string;
  network: string;
  overall_score: number;
  accuracy_score?: number;
  reliability_score?: number;
  speed_score?: number;
  value_score?: number;
  weighted_score?: number;
  total_feedbacks: number;
  positive_feedbacks: number;
  negative_feedbacks: number;
  unique_clients: number;
  sybil_risk: number;
  first_feedback_at?: Date;
  last_feedback_at?: Date;
  calculated_at?: Date;
  updated_at?: Date;
}

/**
 * Match Log 数据（数据库模型）
 */
export interface MatchLogDB {
  id?: number;
  task_description: string;
  task_category?: string;
  task_intent?: string;
  extracted_domains?: string[];
  extracted_skills?: string[];
  extracted_capabilities?: string[];
  task_complexity?: number;
  matched_agent_ids?: string[];
  match_count: number;
  processing_time_ms: number;
  user_ip?: string;
  user_agent?: string;
  created_at?: Date;
}

/**
 * 数据库服务
 */
export class DatabaseService {
  private pool: Pool;
  private isConnected: boolean = false;

  constructor(config?: PoolConfig) {
    // 使用环境变量或提供的配置
    this.pool = new Pool(
      config || {
        connectionString:
          process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
      }
    );

    // 连接事件
    this.pool.on('connect', () => {
      this.isConnected = true;
    });

    this.pool.on('error', (err) => {
      console.error('PostgreSQL pool error:', err);
      this.isConnected = false;
    });
  }

  /**
   * 测试连接
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.pool.query('SELECT NOW()');
      this.isConnected = true;
      return true;
    } catch (error) {
      console.error('Database connection test failed:', error);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * 关闭连接池
   */
  async close(): Promise<void> {
    await this.pool.end();
    this.isConnected = false;
  }

  // ============================================
  // Agents 表操作
  // ============================================

  /**
   * 插入或更新 Agent
   */
  async upsertAgent(agent: AgentDB): Promise<void> {
    const query = `
      INSERT INTO agents (
        agent_id, owner_address, agent_uri, network,
        name, description, image, domains, skills, capabilities,
        services, x402_support, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (agent_id, network)
      DO UPDATE SET
        owner_address = EXCLUDED.owner_address,
        agent_uri = EXCLUDED.agent_uri,
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        image = EXCLUDED.image,
        domains = EXCLUDED.domains,
        skills = EXCLUDED.skills,
        capabilities = EXCLUDED.capabilities,
        services = EXCLUDED.services,
        x402_support = EXCLUDED.x402_support,
        updated_at = NOW()
    `;

    await this.pool.query(query, [
      agent.agent_id,
      agent.owner_address,
      agent.agent_uri,
      agent.network,
      agent.name,
      agent.description,
      agent.image,
      agent.domains,
      agent.skills,
      agent.capabilities,
      agent.services ? JSON.stringify(agent.services) : null,
      agent.x402_support,
      agent.created_at,
    ]);
  }

  /**
   * 批量插入 Agents
   */
  async batchUpsertAgents(agents: AgentDB[]): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      for (const agent of agents) {
        await this.upsertAgent(agent);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 查询 Agents
   */
  async queryAgents(filters: {
    network?: string;
    domains?: string[];
    skills?: string[];
    capabilities?: string[];
    minOverallScore?: number;
    limit?: number;
    offset?: number;
  }): Promise<AgentDB[]> {
    let query = `
      SELECT a.*, r.overall_score
      FROM agents a
      LEFT JOIN reputation_scores r ON a.agent_id = r.agent_id AND a.network = r.network
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (filters.network) {
      query += ` AND a.network = $${paramIndex++}`;
      params.push(filters.network);
    }

    if (filters.domains && filters.domains.length > 0) {
      query += ` AND a.domains && $${paramIndex++}`;
      params.push(filters.domains);
    }

    if (filters.skills && filters.skills.length > 0) {
      query += ` AND a.skills && $${paramIndex++}`;
      params.push(filters.skills);
    }

    if (filters.capabilities && filters.capabilities.length > 0) {
      query += ` AND a.capabilities && $${paramIndex++}`;
      params.push(filters.capabilities);
    }

    if (filters.minOverallScore !== undefined) {
      query += ` AND r.overall_score >= $${paramIndex++}`;
      params.push(filters.minOverallScore);
    }

    query += ` ORDER BY r.overall_score DESC NULLS LAST`;

    if (filters.limit) {
      query += ` LIMIT $${paramIndex++}`;
      params.push(filters.limit);
    }

    if (filters.offset) {
      query += ` OFFSET $${paramIndex++}`;
      params.push(filters.offset);
    }

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  // ============================================
  // Feedbacks 表操作
  // ============================================

  /**
   * 插入 Feedback
   */
  async insertFeedback(feedback: FeedbackDB): Promise<void> {
    const query = `
      INSERT INTO feedbacks (
        feedback_id, agent_id, client_address, network,
        value, value_decimals, numeric_score,
        tag1, tag2, endpoint, data_uri, revoked, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (feedback_id, network) DO NOTHING
    `;

    await this.pool.query(query, [
      feedback.feedback_id,
      feedback.agent_id,
      feedback.client_address,
      feedback.network,
      feedback.value,
      feedback.value_decimals,
      feedback.numeric_score,
      feedback.tag1,
      feedback.tag2,
      feedback.endpoint,
      feedback.data_uri,
      feedback.revoked,
      feedback.created_at,
    ]);
  }

  /**
   * 查询 Agent 的 Feedbacks
   */
  async getAgentFeedbacks(agentId: string, network: string): Promise<FeedbackDB[]> {
    const query = `
      SELECT * FROM feedbacks
      WHERE agent_id = $1 AND network = $2 AND revoked = false
      ORDER BY created_at DESC
    `;

    const result = await this.pool.query(query, [agentId, network]);
    return result.rows;
  }

  // ============================================
  // Reputation Scores 表操作
  // ============================================

  /**
   * 插入或更新 Reputation Score
   */
  async upsertReputationScore(score: ReputationScoreDB): Promise<void> {
    const query = `
      INSERT INTO reputation_scores (
        agent_id, network, overall_score,
        accuracy_score, reliability_score, speed_score, value_score,
        weighted_score, total_feedbacks, positive_feedbacks, negative_feedbacks,
        unique_clients, sybil_risk, first_feedback_at, last_feedback_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (agent_id, network)
      DO UPDATE SET
        overall_score = EXCLUDED.overall_score,
        accuracy_score = EXCLUDED.accuracy_score,
        reliability_score = EXCLUDED.reliability_score,
        speed_score = EXCLUDED.speed_score,
        value_score = EXCLUDED.value_score,
        weighted_score = EXCLUDED.weighted_score,
        total_feedbacks = EXCLUDED.total_feedbacks,
        positive_feedbacks = EXCLUDED.positive_feedbacks,
        negative_feedbacks = EXCLUDED.negative_feedbacks,
        unique_clients = EXCLUDED.unique_clients,
        sybil_risk = EXCLUDED.sybil_risk,
        first_feedback_at = EXCLUDED.first_feedback_at,
        last_feedback_at = EXCLUDED.last_feedback_at,
        calculated_at = NOW()
    `;

    await this.pool.query(query, [
      score.agent_id,
      score.network,
      score.overall_score,
      score.accuracy_score,
      score.reliability_score,
      score.speed_score,
      score.value_score,
      score.weighted_score,
      score.total_feedbacks,
      score.positive_feedbacks,
      score.negative_feedbacks,
      score.unique_clients,
      score.sybil_risk,
      score.first_feedback_at,
      score.last_feedback_at,
    ]);
  }

  /**
   * 获取 Reputation Score
   */
  async getReputationScore(agentId: string, network: string): Promise<ReputationScoreDB | null> {
    const query = `
      SELECT * FROM reputation_scores
      WHERE agent_id = $1 AND network = $2
    `;

    const result = await this.pool.query(query, [agentId, network]);
    return result.rows[0] || null;
  }

  // ============================================
  // Match Logs 表操作
  // ============================================

  /**
   * 记录匹配日志
   */
  async logMatch(log: MatchLogDB): Promise<void> {
    const query = `
      INSERT INTO match_logs (
        task_description, task_category, task_intent,
        extracted_domains, extracted_skills, extracted_capabilities,
        task_complexity, matched_agent_ids, match_count,
        processing_time_ms, user_ip, user_agent
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `;

    await this.pool.query(query, [
      log.task_description,
      log.task_category,
      log.task_intent,
      log.extracted_domains,
      log.extracted_skills,
      log.extracted_capabilities,
      log.task_complexity,
      log.matched_agent_ids,
      log.match_count,
      log.processing_time_ms,
      log.user_ip,
      log.user_agent,
    ]);
  }

  /**
   * 查询匹配日志统计
   */
  async getMatchStats(days: number = 7): Promise<any> {
    const query = `
      SELECT
        DATE(created_at) as date,
        COUNT(*) as total_matches,
        AVG(match_count) as avg_matches_per_request,
        AVG(processing_time_ms) as avg_processing_time
      FROM match_logs
      WHERE created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;

    const result = await this.pool.query(query);
    return result.rows;
  }
}
