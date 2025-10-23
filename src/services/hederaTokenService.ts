/**
 * 🪙 HEDERA TOKEN SERVICE
 * Service for VEILO token creation, minting, and transfers
 */

import { HEDERA_CONFIG } from '@/config/hedera';
import { logger } from './logger';

interface TokenBalance {
  tokenId: string;
  balance: number;
  symbol: string;
  decimals: number;
}

interface TransferResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}

class HederaTokenService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = HEDERA_CONFIG.MIRROR_NODE_URL;
  }

  /**
   * Get VEILO token balance for a user
   * (Token must be created via backend first)
   */
  async getVeiloBalance(accountId: string): Promise<{
    success: boolean;
    balance?: number;
    error?: string;
  }> {
    try {
      logger.info('Fetching VEILO token balance', { accountId });

      const response = await fetch(
        `${this.baseUrl}/api/v1/accounts/${accountId}/tokens`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch token balance: ${response.status}`);
      }

      const data = await response.json();
      
      // Find VEILO token (will be set after backend creates it)
      const veiloToken = data.tokens?.find((t: any) => 
        t.symbol === HEDERA_CONFIG.VEILO_TOKEN.SYMBOL
      );

      const balance = veiloToken 
        ? parseInt(veiloToken.balance) / Math.pow(10, HEDERA_CONFIG.VEILO_TOKEN.DECIMALS)
        : 0;

      logger.info('VEILO balance retrieved', { accountId, balance });

      return {
        success: true,
        balance,
      };
    } catch (error) {
      logger.error('Failed to fetch VEILO balance', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Balance fetch failed',
      };
    }
  }

  /**
   * Get all token balances for an account
   */
  async getAllTokenBalances(accountId: string): Promise<{
    success: boolean;
    balances?: TokenBalance[];
    error?: string;
  }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/accounts/${accountId}/tokens`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch tokens: ${response.status}`);
      }

      const data = await response.json();
      
      const balances: TokenBalance[] = data.tokens?.map((t: any) => ({
        tokenId: t.token_id,
        balance: parseInt(t.balance),
        symbol: t.symbol || 'UNKNOWN',
        decimals: t.decimals || 0,
      })) || [];

      return {
        success: true,
        balances,
      };
    } catch (error) {
      logger.error('Failed to fetch token balances', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Fetch failed',
      };
    }
  }

  /**
   * Get VEILO token transaction history
   */
  async getTokenTransactions(accountId: string, tokenId?: string): Promise<{
    success: boolean;
    transactions?: any[];
    error?: string;
  }> {
    try {
      const endpoint = tokenId
        ? `accounts/${accountId}/tokens?token.id=${tokenId}&type=cryptotransfer`
        : `accounts/${accountId}/tokens?type=cryptotransfer`;

      const response = await fetch(`${this.baseUrl}/api/v1/${endpoint}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch transactions: ${response.status}`);
      }

      const data = await response.json();

      return {
        success: true,
        transactions: data.transactions || [],
      };
    } catch (error) {
      logger.error('Failed to fetch token transactions', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Fetch failed',
      };
    }
  }

  /**
   * Verify a token transfer transaction
   */
  async verifyTransfer(transactionId: string): Promise<{
    success: boolean;
    verified?: boolean;
    details?: any;
    error?: string;
  }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/transactions/${transactionId}`
      );

      if (!response.ok) {
        throw new Error(`Transaction not found: ${transactionId}`);
      }

      const data = await response.json();
      const transaction = data.transactions?.[0];

      const verified = transaction?.result === 'SUCCESS';

      logger.info('Token transfer verified', { 
        transactionId, 
        verified,
        result: transaction?.result 
      });

      return {
        success: true,
        verified,
        details: transaction,
      };
    } catch (error) {
      logger.error('Failed to verify transfer', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Verification failed',
      };
    }
  }

  /**
   * Build HashScan URL for token explorer
   */
  getTokenExplorerUrl(tokenId: string): string {
    return `${HEDERA_CONFIG.EXPLORER_URL}/token/${tokenId}`;
  }

  /**
   * Build HashScan URL for transaction
   */
  getTransactionExplorerUrl(transactionId: string): string {
    return `${HEDERA_CONFIG.EXPLORER_URL}/transaction/${transactionId}`;
  }
}

export const hederaTokenService = new HederaTokenService();
