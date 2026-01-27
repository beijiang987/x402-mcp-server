/**
 * Unified Chain Configuration
 *
 * Centralized mapping for all blockchain networks across different data sources
 * Eliminates duplicate mappings and ensures consistency
 */

export interface ChainConfig {
  name: string;
  displayName: string;
  chainId: number;
  coingecko: string;
  goplus: string;
  defillama: string;
  dexscreener: string;
  rpcUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  blockExplorer: string;
}

/**
 * Supported Blockchain Networks
 */
export const CHAINS: Record<string, ChainConfig> = {
  ethereum: {
    name: 'ethereum',
    displayName: 'Ethereum',
    chainId: 1,
    coingecko: 'ethereum',
    goplus: '1',
    defillama: 'Ethereum',
    dexscreener: 'ethereum',
    rpcUrl: process.env.RPC_ETH || 'https://eth.llamarpc.com',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    blockExplorer: 'https://etherscan.io',
  },

  base: {
    name: 'base',
    displayName: 'Base',
    chainId: 8453,
    coingecko: 'base',
    goplus: '8453',
    defillama: 'Base',
    dexscreener: 'base',
    rpcUrl: process.env.RPC_BASE || 'https://mainnet.base.org',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    blockExplorer: 'https://basescan.org',
  },

  polygon: {
    name: 'polygon',
    displayName: 'Polygon',
    chainId: 137,
    coingecko: 'polygon-pos',
    goplus: '137',
    defillama: 'Polygon',
    dexscreener: 'polygon',
    rpcUrl: 'https://polygon-rpc.com',
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18,
    },
    blockExplorer: 'https://polygonscan.com',
  },

  arbitrum: {
    name: 'arbitrum',
    displayName: 'Arbitrum One',
    chainId: 42161,
    coingecko: 'arbitrum-one',
    goplus: '42161',
    defillama: 'Arbitrum',
    dexscreener: 'arbitrum',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    blockExplorer: 'https://arbiscan.io',
  },

  optimism: {
    name: 'optimism',
    displayName: 'Optimism',
    chainId: 10,
    coingecko: 'optimistic-ethereum',
    goplus: '10',
    defillama: 'Optimism',
    dexscreener: 'optimism',
    rpcUrl: 'https://mainnet.optimism.io',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    blockExplorer: 'https://optimistic.etherscan.io',
  },

  bsc: {
    name: 'bsc',
    displayName: 'BNB Smart Chain',
    chainId: 56,
    coingecko: 'binance-smart-chain',
    goplus: '56',
    defillama: 'BSC',
    dexscreener: 'bsc',
    rpcUrl: 'https://bsc-dataseed.binance.org',
    nativeCurrency: {
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18,
    },
    blockExplorer: 'https://bscscan.com',
  },
};

/**
 * Get chain configuration by name
 */
export function getChainConfig(chainName: string): ChainConfig {
  const chain = CHAINS[chainName.toLowerCase()];
  if (!chain) {
    throw new Error(`Unsupported chain: ${chainName}`);
  }
  return chain;
}

/**
 * Get chain configuration by chain ID
 */
export function getChainById(chainId: number): ChainConfig | undefined {
  return Object.values(CHAINS).find((chain) => chain.chainId === chainId);
}

/**
 * Get CoinGecko platform ID for chain
 */
export function getCoinGeckoPlatform(chainName: string): string {
  return getChainConfig(chainName).coingecko;
}

/**
 * Get GoPlus chain ID for chain
 */
export function getGoPlusChainId(chainName: string): string {
  return getChainConfig(chainName).goplus;
}

/**
 * Get DeFiLlama chain name for chain
 */
export function getDefiLlamaChain(chainName: string): string {
  return getChainConfig(chainName).defillama;
}

/**
 * Get DEX Screener chain name for chain
 */
export function getDexScreenerChain(chainName: string): string {
  return getChainConfig(chainName).dexscreener;
}

/**
 * Get all supported chain names
 */
export function getSupportedChains(): string[] {
  return Object.keys(CHAINS);
}

/**
 * Check if chain is supported
 */
export function isChainSupported(chainName: string): boolean {
  return chainName.toLowerCase() in CHAINS;
}

/**
 * Get RPC URL for chain
 */
export function getRpcUrl(chainName: string): string {
  return getChainConfig(chainName).rpcUrl;
}

/**
 * Get block explorer URL for chain
 */
export function getBlockExplorer(chainName: string, txHash?: string): string {
  const chain = getChainConfig(chainName);
  if (txHash) {
    return `${chain.blockExplorer}/tx/${txHash}`;
  }
  return chain.blockExplorer;
}
