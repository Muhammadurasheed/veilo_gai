/**
 * 🎯 FLAGSHIP BREAKOUT BACKEND SERVICE
 * Comprehensive backend API integration for breakout rooms
 * Built for FAANG-level excellence with robust error handling
 */

import { apiRequest } from './api';
import { logger } from './logger';

export interface BreakoutRoomConfig {
  name: string;
  topic?: string;
  description?: string;
  maxParticipants: number;
  facilitatorId?: string;
  settings: {
    allowTextChat: boolean;
    allowVoiceChat: boolean;
    allowScreenShare: boolean;
    moderationEnabled: boolean;
    recordingEnabled: boolean;
    voiceModulationEnabled: boolean;
    allowReactions: boolean;
    allowPolls: boolean;
  };
  duration?: number;
  autoClose?: boolean;
  isPrivate?: boolean;
  requiresApproval?: boolean;
  inviteCode?: string;
  tags?: string[];
}

export interface BreakoutRoom {
  id: string;
  name: string;
  topic?: string;
  description?: string;
  facilitatorId: string;
  facilitatorAlias: string;
  sessionId: string;
  participants: Array<{
    id: string;
    alias: string;
    avatarIndex: number;
    isConnected: boolean;
    isMuted: boolean;
    isVideoOn: boolean;
    joinedAt: string;
    role: 'participant' | 'facilitator' | 'observer';
  }>;
  maxParticipants: number;
  currentParticipants: number;
  status: 'waiting' | 'active' | 'paused' | 'ended';
  settings: BreakoutRoomConfig['settings'];
  agoraChannelName: string;
  agoraToken?: string;
  metrics: {
    totalJoins: number;
    averageStayDuration: number;
    messagesCount: number;
    reactionsCount: number;
  };
  timestamps: {
    createdAt: string;
    startedAt?: string;
    endedAt?: string;
    lastActivity: string;
  };
  isPrivate: boolean;
  requiresApproval: boolean;
  inviteCode?: string;
  tags: string[];
  canJoin: boolean;
  joinUrl?: string;
}

export interface BreakoutParticipant {
  id: string;
  alias: string;
  avatarIndex: number;
  role: 'participant' | 'facilitator' | 'observer';
  permissions: string[];
  status: 'joining' | 'connected' | 'disconnected' | 'kicked';
  audio: {
    isMuted: boolean;
    hasPermission: boolean;
    quality: 'excellent' | 'good' | 'fair' | 'poor';
  };
  video: {
    isOn: boolean;
    hasPermission: boolean;
  };
  networkMetrics: {
    latency: number;
    packetLoss: number;
    quality: number;
  };
  joinedAt: string;
  lastActivity: string;
}

export interface BreakoutAssignment {
  participantId: string;
  roomId: string;
  assignedBy: string;
  assignedAt: string;
  autoAssigned: boolean;
}

export interface BreakoutAnalytics {
  sessionId: string;
  totalRooms: number;
  totalParticipants: number;
  averageRoomSize: number;
  averageDuration: number;
  completionRate: number;
  engagementScore: number;
  roomAnalytics: Array<{
    roomId: string;
    name: string;
    participantCount: number;
    duration: number;
    messagesCount: number;
    engagementLevel: 'low' | 'medium' | 'high';
  }>;
}

class FlagshipBreakoutBackendService {
  private baseUrl = '/api/flagship-sanctuary';
  
  // Room Management
  async createBreakoutRoom(
    sessionId: string, 
    config: BreakoutRoomConfig
  ): Promise<{ success: boolean; room?: BreakoutRoom; error?: string }> {
    try {
      logger.info('🏗️ Creating flagship breakout room:', { sessionId, config });
      
      const response = await apiRequest('POST', `${this.baseUrl}/${sessionId}/breakout-rooms`, {
        ...config,
        sessionId,
        createdAt: new Date().toISOString()
      });
      
      if (response.success && response.data?.room) {
        logger.info('✅ Breakout room created successfully:', response.data.room.id);
        return { success: true, room: response.data.room };
      }
      
      logger.error('❌ Room creation failed:', response.error);
      return { success: false, error: response.error || 'Failed to create breakout room' };
      
    } catch (error) {
      logger.error('❌ Room creation exception:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }
  
  async getBreakoutRooms(
    sessionId: string
  ): Promise<{ success: boolean; rooms?: BreakoutRoom[]; error?: string }> {
    try {
      const response = await apiRequest('GET', `${this.baseUrl}/${sessionId}/breakout-rooms`);
      
      if (response.success && response.data?.rooms) {
        return { success: true, rooms: response.data.rooms };
      }
      
      return { success: false, error: response.error || 'Failed to fetch breakout rooms' };
      
    } catch (error) {
      logger.error('❌ Get rooms exception:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }
  
  async getBreakoutRoom(
    sessionId: string, 
    roomId: string
  ): Promise<{ success: boolean; room?: BreakoutRoom; error?: string }> {
    try {
      const response = await apiRequest('GET', `${this.baseUrl}/${sessionId}/breakout-rooms/${roomId}`);
      
      if (response.success && response.data?.room) {
        return { success: true, room: response.data.room };
      }
      
      return { success: false, error: response.error || 'Room not found' };
      
    } catch (error) {
      logger.error('❌ Get room exception:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }
  
  async updateBreakoutRoom(
    sessionId: string, 
    roomId: string, 
    updates: Partial<BreakoutRoomConfig>
  ): Promise<{ success: boolean; room?: BreakoutRoom; error?: string }> {
    try {
      const response = await apiRequest('PUT', `${this.baseUrl}/${sessionId}/breakout-rooms/${roomId}`, updates);
      
      if (response.success && response.data?.room) {
        return { success: true, room: response.data.room };
      }
      
      return { success: false, error: response.error || 'Failed to update room' };
      
    } catch (error) {
      logger.error('❌ Update room exception:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }
  
  async deleteBreakoutRoom(
    sessionId: string, 
    roomId: string, 
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await apiRequest('DELETE', `${this.baseUrl}/${sessionId}/breakout-rooms/${roomId}`, {
        reason: reason || 'Room deleted by host'
      });
      
      if (response.success) {
        return { success: true };
      }
      
      return { success: false, error: response.error || 'Failed to delete room' };
      
    } catch (error) {
      logger.error('❌ Delete room exception:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }
  
  // Participant Management
  async joinBreakoutRoom(
    sessionId: string,
    roomId: string,
    participant: {
      id: string;
      alias: string;
      avatarIndex: number;
      role?: 'participant' | 'facilitator' | 'observer';
    }
  ): Promise<{ success: boolean; room?: BreakoutRoom; agoraToken?: string; error?: string }> {
    try {
      logger.info('🚪 Joining breakout room:', { sessionId, roomId, participant });
      
      const response = await apiRequest('POST', `${this.baseUrl}/${sessionId}/breakout-rooms/${roomId}/join`, {
        ...participant,
        joinedAt: new Date().toISOString()
      });
      
      if (response.success && response.data) {
        return { 
          success: true, 
          room: response.data.room,
          agoraToken: response.data.agoraToken 
        };
      }
      
      return { success: false, error: response.error || 'Failed to join room' };
      
    } catch (error) {
      logger.error('❌ Join room exception:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }
  
  async leaveBreakoutRoom(
    sessionId: string,
    roomId: string,
    participantId: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await apiRequest('POST', `${this.baseUrl}/${sessionId}/breakout-rooms/${roomId}/leave`, {
        participantId,
        reason: reason || 'Participant left voluntarily',
        leftAt: new Date().toISOString()
      });
      
      if (response.success) {
        return { success: true };
      }
      
      return { success: false, error: response.error || 'Failed to leave room' };
      
    } catch (error) {
      logger.error('❌ Leave room exception:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }
  
  // Auto Assignment
  async autoAssignParticipants(
    sessionId: string,
    strategy: 'balanced' | 'random' | 'skill-based' = 'balanced',
    options?: {
      excludeParticipants?: string[];
      targetRoomIds?: string[];
      maxPerRoom?: number;
    }
  ): Promise<{ success: boolean; assignments?: BreakoutAssignment[]; error?: string }> {
    try {
      logger.info('🔄 Auto-assigning participants:', { sessionId, strategy, options });
      
      const response = await apiRequest('POST', `${this.baseUrl}/${sessionId}/breakout-rooms/auto-assign`, {
        strategy,
        options: options || {},
        timestamp: new Date().toISOString()
      });
      
      if (response.success && response.data?.assignments) {
        return { success: true, assignments: response.data.assignments };
      }
      
      return { success: false, error: response.error || 'Failed to auto-assign participants' };
      
    } catch (error) {
      logger.error('❌ Auto-assign exception:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }
  
  async manualAssignParticipant(
    sessionId: string,
    roomId: string,
    participantId: string,
    assignedBy: string
  ): Promise<{ success: boolean; assignment?: BreakoutAssignment; error?: string }> {
    try {
      const response = await apiRequest('POST', `${this.baseUrl}/${sessionId}/breakout-rooms/${roomId}/assign`, {
        participantId,
        assignedBy,
        assignedAt: new Date().toISOString(),
        autoAssigned: false
      });
      
      if (response.success && response.data?.assignment) {
        return { success: true, assignment: response.data.assignment };
      }
      
      return { success: false, error: response.error || 'Failed to assign participant' };
      
    } catch (error) {
      logger.error('❌ Manual assign exception:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }
  
  // Analytics & Monitoring
  async getBreakoutAnalytics(
    sessionId: string
  ): Promise<{ success: boolean; analytics?: BreakoutAnalytics; error?: string }> {
    try {
      const response = await apiRequest('GET', `${this.baseUrl}/${sessionId}/breakout-rooms/analytics`);
      
      if (response.success && response.data?.analytics) {
        return { success: true, analytics: response.data.analytics };
      }
      
      return { success: false, error: response.error || 'Failed to fetch analytics' };
      
    } catch (error) {
      logger.error('❌ Analytics exception:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }
  
  async getRoomParticipants(
    sessionId: string,
    roomId: string
  ): Promise<{ success: boolean; participants?: BreakoutParticipant[]; error?: string }> {
    try {
      const response = await apiRequest('GET', `${this.baseUrl}/${sessionId}/breakout-rooms/${roomId}/participants`);
      
      if (response.success && response.data?.participants) {
        return { success: true, participants: response.data.participants };
      }
      
      return { success: false, error: response.error || 'Failed to fetch participants' };
      
    } catch (error) {
      logger.error('❌ Get participants exception:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }
  
  // Advanced Features
  async sendBreakoutMessage(
    sessionId: string,
    roomId: string,
    message: {
      content: string;
      type: 'text' | 'system' | 'announcement';
      senderId: string;
      senderAlias: string;
    }
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const response = await apiRequest('POST', `${this.baseUrl}/${sessionId}/breakout-rooms/${roomId}/messages`, {
        ...message,
        timestamp: new Date().toISOString()
      });
      
      if (response.success && response.data?.messageId) {
        return { success: true, messageId: response.data.messageId };
      }
      
      return { success: false, error: response.error || 'Failed to send message' };
      
    } catch (error) {
      logger.error('❌ Send message exception:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }
  
  async moderateBreakoutRoom(
    sessionId: string,
    roomId: string,
    action: {
      type: 'mute' | 'unmute' | 'kick' | 'warning' | 'promote' | 'demote';
      targetParticipantId: string;
      moderatorId: string;
      reason?: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await apiRequest('POST', `${this.baseUrl}/${sessionId}/breakout-rooms/${roomId}/moderate`, {
        ...action,
        timestamp: new Date().toISOString()
      });
      
      if (response.success) {
        return { success: true };
      }
      
      return { success: false, error: response.error || 'Moderation action failed' };
      
    } catch (error) {
      logger.error('❌ Moderation exception:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }
  
  async recordBreakoutRoom(
    sessionId: string,
    roomId: string,
    action: 'start' | 'stop' | 'pause' | 'resume',
    options?: {
      format?: 'mp4' | 'mp3' | 'wav';
      quality?: 'low' | 'medium' | 'high' | 'ultra';
      includeVideo?: boolean;
      includeChat?: boolean;
    }
  ): Promise<{ success: boolean; recordingId?: string; error?: string }> {
    try {
      const response = await apiRequest('POST', `${this.baseUrl}/${sessionId}/breakout-rooms/${roomId}/recording`, {
        action,
        options: options || {},
        timestamp: new Date().toISOString()
      });
      
      if (response.success) {
        return { 
          success: true, 
          recordingId: response.data?.recordingId 
        };
      }
      
      return { success: false, error: response.error || 'Recording action failed' };
      
    } catch (error) {
      logger.error('❌ Recording exception:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }
}

// Create singleton instance
export const flagshipBreakoutBackend = new FlagshipBreakoutBackendService();