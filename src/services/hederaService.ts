/**
 * 🌐 HEDERA BLOCKCHAIN SERVICE
 * Core service for Hedera Hashgraph integrations
 */

import { HEDERA_CONFIG, getExplorerUrl, getMirrorNodeUrl } from '@/config/hedera';
import { logger } from './logger';

interface HederaTopicMessage {
  consensus_timestamp: string;
  message: string;
  payer_account_id: string;
  sequence_number: number;
}

interface ExpertCredential {
  expertId: string;
  licenseNumber: string;
  institution: string;
  specialization: string;
  verifiedAt: string;
  verifier: string;
}

class HederaService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = HEDERA_CONFIG.MIRROR_NODE_URL;
  }

  /**
   * Verify expert credentials from Hedera Consensus Service
   */
  async verifyExpertCredentials(topicId: string): Promise<{
    success: boolean;
    credential?: ExpertCredential;
    messages?: HederaTopicMessage[];
    error?: string;
  }> {
    try {
      logger.info('Verifying expert credentials from HCS', { topicId });

      const response = await fetch(getMirrorNodeUrl(`topics/${topicId}/messages`));
      
      if (!response.ok) {
        throw new Error(`Mirror node responded with ${response.status}`);
      }

      const data = await response.json();
      const messages: HederaTopicMessage[] = data.messages || [];

      if (messages.length === 0) {
        return { success: false, error: 'No verification messages found' };
      }

      // Get the latest message (most recent verification)
      const latestMessage = messages[messages.length - 1];
      const decodedMessage = atob(latestMessage.message);
      const credential: ExpertCredential = JSON.parse(decodedMessage);

      logger.info('Expert credentials verified', { expertId: credential.expertId });

      return {
        success: true,
        credential,
        messages,
      };
    } catch (error) {
      logger.error('Failed to verify expert credentials', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Verification failed',
      };
    }
  }

  /**
   * Get transaction details from Hedera
   */
  async getTransaction(transactionId: string): Promise<{
    success: boolean;
    transaction?: any;
    error?: string;
  }> {
    try {
      const response = await fetch(getMirrorNodeUrl(`transactions/${transactionId}`));
      
      if (!response.ok) {
        throw new Error(`Transaction not found: ${transactionId}`);
      }

      const data = await response.json();

      return {
        success: true,
        transaction: data.transactions?.[0],
      };
    } catch (error) {
      logger.error('Failed to fetch transaction', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Transaction fetch failed',
      };
    }
  }

  /**
   * Get token balance for an account
   */
  async getTokenBalance(accountId: string, tokenId: string): Promise<{
    success: boolean;
    balance?: number;
    error?: string;
  }> {
    try {
      const response = await fetch(getMirrorNodeUrl(`accounts/${accountId}/tokens?token.id=${tokenId}`));
      
      if (!response.ok) {
        throw new Error(`Failed to fetch token balance`);
      }

      const data = await response.json();
      const tokenInfo = data.tokens?.find((t: any) => t.token_id === tokenId);

      return {
        success: true,
        balance: tokenInfo ? parseInt(tokenInfo.balance) : 0,
      };
    } catch (error) {
      logger.error('Failed to fetch token balance', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Balance fetch failed',
      };
    }
  }

  /**
   * Get NFTs owned by an account
   */
  async getAccountNFTs(accountId: string, tokenId?: string): Promise<{
    success: boolean;
    nfts?: any[];
    error?: string;
  }> {
    try {
      const endpoint = tokenId 
        ? `accounts/${accountId}/nfts?token.id=${tokenId}`
        : `accounts/${accountId}/nfts`;
        
      const response = await fetch(getMirrorNodeUrl(endpoint));
      
      if (!response.ok) {
        throw new Error(`Failed to fetch NFTs`);
      }

      const data = await response.json();

      return {
        success: true,
        nfts: data.nfts || [],
      };
    } catch (error) {
      logger.error('Failed to fetch NFTs', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'NFT fetch failed',
      };
    }
  }

  /**
   * Build explorer URL for easy verification
   */
  getExplorerUrl(type: 'transaction' | 'topic' | 'token' | 'account', id: string): string {
    return getExplorerUrl(type, id);
  }

  /**
   * Check if Hedera services are available
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/network/supply`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const hederaService = new HederaService();
