/**
 * 任务理解服务
 *
 * 使用 Claude API 分析用户任务描述，提取：
 * - 任务意图
 * - 所需领域知识
 * - 所需技能
 * - 所需能力（A2A, MCP, webhook 等）
 */

import Anthropic from '@anthropic-ai/sdk';

/**
 * 任务理解结果
 */
export interface TaskUnderstanding {
  // 任务摘要
  summary: string;

  // 任务意图（what the user wants to achieve）
  intent: string;

  // 所需领域（如：blockchain, finance, data-analysis）
  domains: string[];

  // 所需技能（如：python, solidity, smart-contract）
  skills: string[];

  // 所需能力（如：A2A, MCP, webhook, REST API）
  capabilities: string[];

  // 复杂度（1-5，1=简单，5=复杂）
  complexity: number;

  // 嵌入向量（用于语义相似度计算）
  embedding?: number[];
}

/**
 * 任务理解服务
 */
export class TaskUnderstandingService {
  private client: Anthropic;

  constructor(apiKey?: string) {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * 理解任务描述
   */
  async understandTask(taskDescription: string): Promise<TaskUnderstanding> {
    const prompt = `你是一个 AI Agent 任务分析专家。请分析以下任务描述，提取关键信息。

任务描述：
${taskDescription}

请以 JSON 格式返回：
{
  "summary": "任务简短摘要（1 句话）",
  "intent": "用户想要达成什么目标",
  "domains": ["领域1", "领域2"],  // 如：blockchain, finance, data-analysis, social-media, security
  "skills": ["技能1", "技能2"],    // 如：python, solidity, web3, data-science, nlp
  "capabilities": ["能力1", "能力2"],  // 如：A2A, MCP, webhook, REST-API, websocket, cron
  "complexity": 3  // 1-5，1=简单（如定时查询），5=复杂（如多步推理）
}

只返回 JSON，不要其他文字。`;

    try {
      const response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type');
      }

      // 解析 JSON
      const result = JSON.parse(content.text);

      return {
        summary: result.summary,
        intent: result.intent,
        domains: result.domains || [],
        skills: result.skills || [],
        capabilities: result.capabilities || [],
        complexity: result.complexity || 3,
      };
    } catch (error: any) {
      console.error('Task understanding failed:', error);

      // 降级方案：简单的关键词提取
      return this.fallbackUnderstanding(taskDescription);
    }
  }

  /**
   * 降级方案：基于关键词的简单理解
   */
  private fallbackUnderstanding(taskDescription: string): TaskUnderstanding {
    const lowerText = taskDescription.toLowerCase();

    // 简单的关键词匹配
    const domains: string[] = [];
    const skills: string[] = [];
    const capabilities: string[] = [];

    // 领域检测 - 区块链/加密货币
    if (
      lowerText.includes('blockchain') || lowerText.includes('crypto') || lowerText.includes('web3') ||
      lowerText.includes('区块链') || lowerText.includes('加密') || lowerText.includes('链上') ||
      lowerText.includes('合约') || lowerText.includes('代币') || lowerText.includes('钱包') ||
      lowerText.includes('defi')
    ) {
      domains.push('blockchain');
    }

    // 领域检测 - NFT
    if (
      lowerText.includes('nft') || lowerText.includes('地板价') || lowerText.includes('铸造') ||
      lowerText.includes('mint') || lowerText.includes('opensea') || lowerText.includes('藏品')
    ) {
      domains.push('nft');
      if (!domains.includes('blockchain')) {
        domains.push('blockchain');
      }
    }

    // 领域检测 - 金融/交易
    if (
      lowerText.includes('finance') || lowerText.includes('trading') || lowerText.includes('defi') ||
      lowerText.includes('金融') || lowerText.includes('交易') || lowerText.includes('投资') ||
      lowerText.includes('价格') || lowerText.includes('市场') || lowerText.includes('收益') ||
      lowerText.includes('鲸鱼')
    ) {
      domains.push('finance');
    }

    // 领域检测 - 数据分析
    if (
      lowerText.includes('data') || lowerText.includes('analytics') || lowerText.includes('analysis') ||
      lowerText.includes('数据') || lowerText.includes('分析') || lowerText.includes('统计') ||
      lowerText.includes('监控') || lowerText.includes('查询') || lowerText.includes('报告')
    ) {
      domains.push('data-analysis');
    }

    // 领域检测 - 安全审计
    if (
      lowerText.includes('security') || lowerText.includes('audit') || lowerText.includes('safety') ||
      lowerText.includes('安全') || lowerText.includes('审计') || lowerText.includes('风险') ||
      lowerText.includes('检测')
    ) {
      domains.push('security');
    }

    // 领域检测 - 社交媒体
    if (
      lowerText.includes('social') || lowerText.includes('twitter') || lowerText.includes('推特') ||
      lowerText.includes('发推') || lowerText.includes('推文') || lowerText.includes('telegram') ||
      lowerText.includes('discord') || lowerText.includes('微博') || lowerText.includes('社交')
    ) {
      domains.push('social-media');
    }

    // 领域检测 - 数据采集
    if (
      lowerText.includes('crawler') || lowerText.includes('scraping') || lowerText.includes('爬虫') ||
      lowerText.includes('抓取') || lowerText.includes('采集') || lowerText.includes('爬取')
    ) {
      domains.push('data-collection');
    }

    // 领域检测 - 自然语言处理
    if (
      lowerText.includes('nlp') || lowerText.includes('translation') || lowerText.includes('翻译') ||
      lowerText.includes('总结') || lowerText.includes('摘要') || lowerText.includes('summarize') ||
      lowerText.includes('文本') || lowerText.includes('语言')
    ) {
      domains.push('nlp');
    }

    // 领域检测 - AI 生成
    if (
      lowerText.includes('generate') || lowerText.includes('ai画') || lowerText.includes('生成图') ||
      lowerText.includes('绘画') || lowerText.includes('dall-e') || lowerText.includes('stable diffusion') ||
      lowerText.includes('midjourney') || lowerText.includes('图片生成')
    ) {
      domains.push('ai-generation');
    }

    // 领域检测 - 自动化
    if (
      lowerText.includes('automation') || lowerText.includes('自动化') || lowerText.includes('自动发') ||
      lowerText.includes('定时发') || lowerText.includes('批量') || lowerText.includes('bot')
    ) {
      domains.push('automation');
    }

    // 技能检测
    if (lowerText.includes('python')) skills.push('python');
    if (lowerText.includes('solidity') || lowerText.includes('smart contract') || lowerText.includes('智能合约')) {
      skills.push('solidity');
    }
    if (lowerText.includes('javascript') || lowerText.includes('typescript')) skills.push('javascript');
    if (lowerText.includes('web3') || lowerText.includes('ethers') || lowerText.includes('viem')) {
      skills.push('web3');
    }
    if (lowerText.includes('gpt') || lowerText.includes('claude') || lowerText.includes('llm')) {
      skills.push('llm');
    }
    if (lowerText.includes('机器学习') || lowerText.includes('machine learning') || lowerText.includes('ml')) {
      skills.push('machine-learning');
    }

    // 能力检测
    if (lowerText.includes('api')) capabilities.push('REST-API');
    if (lowerText.includes('webhook')) capabilities.push('webhook');
    if (lowerText.includes('websocket') || lowerText.includes('real-time') || lowerText.includes('实时')) {
      capabilities.push('websocket');
    }
    if (lowerText.includes('定时') || lowerText.includes('cron') || lowerText.includes('schedule')) {
      capabilities.push('cron');
    }

    return {
      summary: taskDescription.substring(0, 100) + (taskDescription.length > 100 ? '...' : ''),
      intent: 'Extract from task description',
      domains: domains.length > 0 ? domains : ['general'],
      skills: skills.length > 0 ? skills : ['general'],
      capabilities: capabilities.length > 0 ? capabilities : ['REST-API'],
      complexity: 3,
    };
  }

  /**
   * 计算任务与 Agent 的语义相似度
   *
   * 使用简化的算法：基于关键词重叠度
   * TODO: 后续可以用向量嵌入 + 余弦相似度
   */
  calculateSimilarity(
    taskUnderstanding: TaskUnderstanding,
    agentMetadata: {
      domains?: string[];
      skills?: string[];
      capabilities?: string[];
      description?: string;
    }
  ): number {
    let score = 0;
    let totalWeight = 0;

    // 领域匹配（权重 40%）
    const domainWeight = 0.4;
    const domainMatch = this.calculateOverlap(
      taskUnderstanding.domains,
      agentMetadata.domains || []
    );
    score += domainMatch * domainWeight;
    totalWeight += domainWeight;

    // 技能匹配（权重 30%）
    const skillWeight = 0.3;
    const skillMatch = this.calculateOverlap(
      taskUnderstanding.skills,
      agentMetadata.skills || []
    );
    score += skillMatch * skillWeight;
    totalWeight += skillWeight;

    // 能力匹配（权重 30%）
    const capabilityWeight = 0.3;
    const capabilityMatch = this.calculateOverlap(
      taskUnderstanding.capabilities,
      agentMetadata.capabilities || []
    );
    score += capabilityMatch * capabilityWeight;
    totalWeight += capabilityWeight;

    return totalWeight > 0 ? score / totalWeight : 0;
  }

  /**
   * 计算两个数组的重叠度（Jaccard 相似度）
   */
  private calculateOverlap(arr1: string[], arr2: string[]): number {
    if (arr1.length === 0 || arr2.length === 0) return 0;

    const set1 = new Set(arr1.map(s => s.toLowerCase()));
    const set2 = new Set(arr2.map(s => s.toLowerCase()));

    let intersection = 0;
    for (const item of set1) {
      if (set2.has(item)) {
        intersection++;
      }
    }

    const union = set1.size + set2.size - intersection;
    return union > 0 ? intersection / union : 0;
  }

  /**
   * 生成匹配原因（为什么这个 Agent 适合这个任务）
   */
  async generateMatchReason(
    taskUnderstanding: TaskUnderstanding,
    agentMetadata: {
      name?: string;
      description?: string;
      domains?: string[];
      skills?: string[];
      capabilities?: string[];
    },
    matchScore: number
  ): Promise<string> {
    // 找到匹配的领域、技能、能力
    const matchedDomains = this.findMatches(
      taskUnderstanding.domains,
      agentMetadata.domains || []
    );
    const matchedSkills = this.findMatches(
      taskUnderstanding.skills,
      agentMetadata.skills || []
    );
    const matchedCapabilities = this.findMatches(
      taskUnderstanding.capabilities,
      agentMetadata.capabilities || []
    );

    // 构造原因
    const reasons: string[] = [];

    if (matchedDomains.length > 0) {
      reasons.push(`擅长 ${matchedDomains.join('、')} 领域`);
    }

    if (matchedSkills.length > 0) {
      reasons.push(`具备 ${matchedSkills.join('、')} 技能`);
    }

    if (matchedCapabilities.length > 0) {
      reasons.push(`支持 ${matchedCapabilities.join('、')} 接口`);
    }

    if (matchScore > 0.8) {
      reasons.push('高度匹配任务需求');
    } else if (matchScore > 0.6) {
      reasons.push('较好匹配任务需求');
    }

    return reasons.length > 0
      ? reasons.join('，')
      : '具备基础能力，可以尝试';
  }

  /**
   * 找到两个数组的交集
   */
  private findMatches(arr1: string[], arr2: string[]): string[] {
    const set2 = new Set(arr2.map(s => s.toLowerCase()));
    return arr1.filter(item => set2.has(item.toLowerCase()));
  }
}
