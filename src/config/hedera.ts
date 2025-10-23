/**
 * 🌐 HEDERA CONFIGURATION
 * Hedera Hashgraph network configuration for Veilo blockchain features
 */

export const HEDERA_CONFIG = {
  // Network Configuration
  NETWORK: import.meta.env.VITE_HEDERA_NETWORK || 'testnet',
  
  // Hedera Mirror Node (for querying blockchain data)
  MIRROR_NODE_URL: import.meta.env.VITE_HEDERA_MIRROR_NODE || 'https://testnet.mirrornode.hedera.com',
  
  // HashScan Explorer (for transaction viewing)
  EXPLORER_URL: import.meta.env.VITE_HEDERA_EXPLORER || 'https://hashscan.io/testnet',
  
  // Veilo Token Configuration
  VEILO_TOKEN: {
    NAME: 'Veilo Credit',
    SYMBOL: 'VLO',
    DECIMALS: 2,
    INITIAL_SUPPLY: 1000000, // 1 million tokens
  },
  
  // Session NFT Configuration
  SESSION_NFT: {
    NAME: 'Veilo Session Completion',
    SYMBOL: 'VSESS',
    COLLECTION_NAME: 'Veilo Wellness Journey',
  },
} as const;

// Helper to build explorer URLs
export const getExplorerUrl = (type: 'transaction' | 'topic' | 'token' | 'account', id: string) => {
  return `${HEDERA_CONFIG.EXPLORER_URL}/${type}/${id}`;
};

// Helper to build mirror node API URLs
export const getMirrorNodeUrl = (endpoint: string) => {
  return `${HEDERA_CONFIG.MIRROR_NODE_URL}/api/v1/${endpoint}`;
};
