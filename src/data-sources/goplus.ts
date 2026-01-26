/**
 * GoPlus Security API Data Source
 *
 * Free tier: 1000 calls/day
 * No API key required
 * Documentation: https://docs.gopluslabs.io/
 */

interface ContractSafety {
  contract_address: string;
  chain: string;
  is_honeypot: boolean;
  is_open_source: boolean;
  is_proxy: boolean;
  is_mintable: boolean;
  can_take_back_ownership: boolean;
  owner_change_balance: boolean;
  hidden_owner: boolean;
  selfdestruct: boolean;
  external_call: boolean;
  buy_tax: number;
  sell_tax: number;
  risk_score: number; // 0-100, higher is riskier
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  warnings: string[];
  last_updated: number;
}

interface GoPlusResponse {
  code: number;
  message: string;
  result: {
    [address: string]: {
      is_honeypot?: string;
      is_open_source?: string;
      is_proxy?: string;
      is_mintable?: string;
      can_take_back_ownership?: string;
      owner_change_balance?: string;
      hidden_owner?: string;
      selfdestruct?: string;
      external_call?: string;
      buy_tax?: string;
      sell_tax?: string;
      holder_count?: string;
      total_supply?: string;
      creator_address?: string;
      [key: string]: any;
    };
  };
}

/**
 * GoPlus Security Data Source
 */
export class GoPlusDataSource {
  private baseUrl = 'https://api.gopluslabs.io/api/v1';
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTTL = 300000; // 5 minutes (security data doesn't change often)

  /**
   * Scan contract for security issues
   */
  async scanContract(contractAddress: string, chain: string): Promise<ContractSafety> {
    const cacheKey = `safety:${chain}:${contractAddress}`;

    // Check cache
    const cached = this.getFromCache<ContractSafety>(cacheKey);
    if (cached) {
      return cached;
    }

    // Map chain to GoPlus chain ID
    const chainId = this.mapChainToId(chain);

    // Fetch from GoPlus
    const url = `${this.baseUrl}/token_security/${chainId}`;
    const params = new URLSearchParams({
      contract_addresses: contractAddress.toLowerCase()
    });

    const response = await fetch(`${url}?${params}`, {
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`GoPlus API error: ${response.status} ${response.statusText}`);
    }

    const data: GoPlusResponse = await response.json();

    if (data.code !== 1) {
      throw new Error(`GoPlus API error: ${data.message}`);
    }

    // Parse response
    const addressKey = contractAddress.toLowerCase();
    const securityData = data.result[addressKey];

    if (!securityData) {
      throw new Error(`Contract not found: ${contractAddress} on ${chain}`);
    }

    // Parse security data
    const result = this.parseSecurityData(contractAddress, chain, securityData);

    // Cache result
    this.setCache(cacheKey, result);

    return result;
  }

  /**
   * Parse GoPlus security data into our format
   */
  private parseSecurityData(
    address: string,
    chain: string,
    data: GoPlusResponse['result'][string]
  ): ContractSafety {
    // Parse boolean fields (GoPlus returns "1" or "0" strings)
    const parseBool = (value: string | undefined): boolean => value === '1';
    const parseNumber = (value: string | undefined): number => parseFloat(value || '0');

    const isHoneypot = parseBool(data.is_honeypot);
    const buyTax = parseNumber(data.buy_tax) * 100; // Convert to percentage
    const sellTax = parseNumber(data.sell_tax) * 100;

    // Calculate risk score (0-100)
    let riskScore = 0;
    const warnings: string[] = [];

    if (isHoneypot) {
      riskScore += 50;
      warnings.push('Honeypot detected - tokens may not be sellable');
    }

    if (!parseBool(data.is_open_source)) {
      riskScore += 15;
      warnings.push('Contract source code not verified');
    }

    if (parseBool(data.is_mintable)) {
      riskScore += 10;
      warnings.push('Owner can mint new tokens');
    }

    if (parseBool(data.can_take_back_ownership)) {
      riskScore += 15;
      warnings.push('Owner can reclaim ownership');
    }

    if (parseBool(data.owner_change_balance)) {
      riskScore += 20;
      warnings.push('Owner can change user balances');
    }

    if (parseBool(data.hidden_owner)) {
      riskScore += 10;
      warnings.push('Hidden owner detected');
    }

    if (parseBool(data.selfdestruct)) {
      riskScore += 15;
      warnings.push('Contract can self-destruct');
    }

    if (buyTax > 10) {
      riskScore += 10;
      warnings.push(`High buy tax: ${buyTax.toFixed(1)}%`);
    }

    if (sellTax > 10) {
      riskScore += 10;
      warnings.push(`High sell tax: ${sellTax.toFixed(1)}%`);
    }

    // Determine risk level
    let riskLevel: ContractSafety['risk_level'];
    if (riskScore >= 70) riskLevel = 'critical';
    else if (riskScore >= 40) riskLevel = 'high';
    else if (riskScore >= 20) riskLevel = 'medium';
    else riskLevel = 'low';

    return {
      contract_address: address,
      chain: chain,
      is_honeypot: isHoneypot,
      is_open_source: parseBool(data.is_open_source),
      is_proxy: parseBool(data.is_proxy),
      is_mintable: parseBool(data.is_mintable),
      can_take_back_ownership: parseBool(data.can_take_back_ownership),
      owner_change_balance: parseBool(data.owner_change_balance),
      hidden_owner: parseBool(data.hidden_owner),
      selfdestruct: parseBool(data.selfdestruct),
      external_call: parseBool(data.external_call),
      buy_tax: buyTax,
      sell_tax: sellTax,
      risk_score: Math.min(riskScore, 100),
      risk_level: riskLevel,
      warnings: warnings,
      last_updated: Date.now()
    };
  }

  /**
   * Map chain name to GoPlus chain ID
   */
  private mapChainToId(chain: string): string {
    const mapping: Record<string, string> = {
      'ethereum': '1',
      'bsc': '56',
      'polygon': '137',
      'arbitrum': '42161',
      'optimism': '10',
      'base': '8453'
    };

    const chainId = mapping[chain.toLowerCase()];
    if (!chainId) {
      throw new Error(`Unsupported chain for GoPlus: ${chain}`);
    }

    return chainId;
  }

  /**
   * Cache helpers
   */
  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > this.cacheTTL) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });

    // Cleanup old entries
    if (this.cache.size > 500) {
      const now = Date.now();
      for (const [k, v] of this.cache.entries()) {
        if (now - v.timestamp > this.cacheTTL) {
          this.cache.delete(k);
        }
      }
    }
  }
}
