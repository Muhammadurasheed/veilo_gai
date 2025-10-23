/**
 * 🎯 FLAGSHIP BREAKOUT ROOM SERVICE
 * Enterprise-grade breakout room management with real-time synchronization
 * Designed to surpass FAANG-level excellence
 */

import enhancedSocketService from './enhancedSocket';
import { getCurrentAuthToken, getAuthHeaders, isTokenValid, debugAuthState, getUserFromToken } from '@/utils/authUtils';
import { FlagshipSanctuaryApi } from '@/services/flagshipSanctuaryApi';
import { flagshipBreakoutBackend } from '@/services/flagshipBreakoutBackend';

interface BreakoutRoom {
  id: string;
  name: string;
  topic?: string;
  facilitatorId: string;
  facilitatorAlias: string;
  participants: Array<{
    id: string;
    alias: string;
    avatarIndex: number;
    isMuted: boolean;
    isConnected: boolean;
    joinedAt: string;
  }>;
  maxParticipants: number;
  status: 'active' | 'waiting' | 'ended';
  duration?: number;
  createdAt: string;
  agoraChannelName: string;
  settings: {
    allowTextChat: boolean;
    allowVoiceChat: boolean;
    allowScreenShare: boolean;
    moderationEnabled: boolean;
  };
}

interface CreateRoomConfig {
  name: string;
  topic?: string;
  maxParticipants: number;
  duration: number;
  facilitatorId: string;
  allowTextChat: boolean;
  allowVoiceChat: boolean;
  allowScreenShare: boolean;
  moderationEnabled: boolean;
  recordingEnabled: boolean;
  autoClose: boolean;
  autoCloseAfterMinutes: number;
}

class FlagshipBreakoutService {
  private eventListeners = new Map<string, Function>();
  private roomCache = new Map<string, BreakoutRoom>();
  private connectionMetrics = {
    roomsCreated: 0,
    roomsJoined: 0,
    messagesExchanged: 0,
    lastActivity: null as string | null
  };

  constructor() {
    this.setupEventListeners();
  }

  /**
   * 🏗️ Create a flagship breakout room with permission validation
   */
  async createBreakoutRoom(sessionId: string, roomConfig: CreateRoomConfig): Promise<{
    success: boolean;
    room?: BreakoutRoom;
    error?: string;
  }> {
    try {
      console.log('🎯 Flagship Breakout Service: Creating room:', { sessionId, roomConfig });

      // Validate configuration
      if (!roomConfig.name?.trim()) {
        throw new Error('Room name is required');
      }

      if (roomConfig.maxParticipants < 2 || roomConfig.maxParticipants > 20) {
        throw new Error('Max participants must be between 2 and 20');
      }

      // Import debug utilities for troubleshooting
      const { debugBreakoutRoomPermissions } = await import('@/utils/debugBreakoutPermissions');
      
      // Also test the backend debug endpoint
      try {
        const debugResponse = await fetch(`/api/debug-breakout/${sessionId}/debug-permissions`, {
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders()
          }
        });
        
        if (debugResponse.ok) {
          const debugData = await debugResponse.json();
          console.log('🔍 Backend debug data:', debugData);
        }
      } catch (debugError) {
        console.warn('⚠️ Backend debug request failed:', debugError);
      }
      
      // Check permissions before attempting creation
      const { validateSessionPermissions } = await import('@/utils/sessionPermissions');
      const permissionCheck = await validateSessionPermissions(sessionId, 'create_breakout_rooms');
      
      if (!permissionCheck.valid) {
        console.error('❌ Permission check failed:', permissionCheck.error);
        
        // Run debug analysis to help troubleshoot
        console.log('🔍 Running debug analysis for permission failure...');
        await debugBreakoutRoomPermissions(sessionId);
        
        return {
          success: false,
          error: permissionCheck.error || 'Insufficient permissions to create breakout rooms'
        };
      }

      console.log('✅ Permission check passed - user can create breakout rooms');

      // Use socket for real-time creation with ack
      if (enhancedSocketService.connected) {
        const result = await new Promise<{ success: boolean; room?: any; error?: string }>((resolve) => {
          const timeout = setTimeout(() => {
            enhancedSocketService.off('breakout_room_created');
            enhancedSocketService.off('breakout_room_create_error');
            resolve({ success: false, error: 'Timed out waiting for server acknowledgment' });
          }, 8000);

          const onCreated = (data: any) => {
            if (data?.sessionId === sessionId && data?.room?.name === roomConfig.name) {
              clearTimeout(timeout);
              enhancedSocketService.off('breakout_room_created', onCreated as any);
              enhancedSocketService.off('breakout_room_create_error', onError as any);
              resolve({ success: true, room: data.room });
            }
          };

          const onError = (err: any) => {
            clearTimeout(timeout);
            enhancedSocketService.off('breakout_room_created', onCreated as any);
            enhancedSocketService.off('breakout_room_create_error', onError as any);
            resolve({ success: false, error: err?.message || 'Server reported creation error' });
          };

          enhancedSocketService.on('breakout_room_created', onCreated as any);
          enhancedSocketService.on('breakout_room_create_error', onError as any);

          enhancedSocketService.createBreakoutRoom(sessionId, roomConfig);
          this.connectionMetrics.roomsCreated++;
          this.connectionMetrics.lastActivity = new Date().toISOString();
        });

        if (result.success) {
          return { success: true, room: result.room };
        }
        // Socket path failed — fallback to HTTP API
        return await this.createRoomViaAPI(sessionId, roomConfig);
      } else {
        // Fallback to HTTP API
        return await this.createRoomViaAPI(sessionId, roomConfig);
      }
    } catch (error) {
      console.error('❌ Flagship Breakout Service: Create room failed:', error);
      
      // Import and run debug analysis on any error
      try {
        const { debugBreakoutRoomPermissions } = await import('@/utils/debugBreakoutPermissions');
        console.log('🔍 Running debug analysis for creation failure...');
        await debugBreakoutRoomPermissions(sessionId);
      } catch (debugError) {
        console.error('❌ Debug analysis failed:', debugError);
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create room'
      };
    }
  }

  /**
   * 🚪 Join a breakout room
   */
  async joinBreakoutRoom(roomId: string, participantData: {
    alias: string;
    avatarIndex: number;
  }): Promise<{
    success: boolean;
    room?: BreakoutRoom;
    error?: string;
  }> {
    try {
      console.log('🚪 Flagship Breakout Service: Joining room:', { roomId, participantData });

      // Use socket for real-time joining
      if (enhancedSocketService.connected) {
        enhancedSocketService.joinBreakoutRoom(roomId, participantData);
        this.connectionMetrics.roomsJoined++;
        this.connectionMetrics.lastActivity = new Date().toISOString();
        
        return { success: true };
      } else {
        // Fallback to HTTP API
        return await this.joinRoomViaAPI(roomId, participantData);
      }
    } catch (error) {
      console.error('❌ Flagship Breakout Service: Join room failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to join room'
      };
    }
  }

  /**
   * 📋 Get all breakout rooms for a session
   */
  async getBreakoutRooms(sessionId: string): Promise<{
    success: boolean;
    rooms?: BreakoutRoom[];
    error?: string;
  }> {
    try {
      console.log('📋 Flagship Breakout Service: Fetching rooms for session:', sessionId);

      // Get the most current token using enhanced auth utils
      const token = getCurrentAuthToken();
      
      if (!token || !isTokenValid(token)) {
        throw new Error('No valid authentication token available');
      }

      const apiPath = `/api/flagship-sanctuary/${sessionId}/breakout-rooms`;
      console.log('🌐 Making request to:', apiPath);
      
      const response = await fetch(apiPath, {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        }
      });

      if (response.ok) {
        const data = await response.json();
        const rooms = data.data?.rooms || data.rooms || [];
        
        // Update cache
        rooms.forEach((room: BreakoutRoom) => {
          this.roomCache.set(room.id, room);
        });

        return { success: true, rooms };
      } else {
        const errorText = await response.text();
        console.error('❌ Get rooms failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Flagship Breakout Service: Get rooms failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch rooms'
      };
    }
  }

  /**
   * 🚶 Leave a breakout room
   */
  async leaveBreakoutRoom(sessionId: string, roomId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      console.log('🚶 Flagship Breakout Service: Leaving room:', { sessionId, roomId });

      // Get the most current token
      const token = localStorage.getItem('veilo-auth-token') || 
                    localStorage.getItem('admin_token') || 
                    localStorage.getItem('token');
      
      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`/api/flagship-sanctuary/${sessionId}/breakout-rooms/${roomId}/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-auth-token': token,
          'auth-token': token
        }
      });

      if (response.ok) {
        // Remove from cache
        this.roomCache.delete(roomId);
        return { success: true };
      } else {
        const errorText = await response.text();
        console.error('❌ Leave room failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Flagship Breakout Service: Leave room failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to leave room'
      };
    }
  }

  /**
   * 🗑️ Delete a breakout room
   */
  async deleteBreakoutRoom(sessionId: string, roomId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      console.log('🗑️ Flagship Breakout Service: Deleting room:', { sessionId, roomId });

      // Get the most current token
      const token = localStorage.getItem('veilo-auth-token') || 
                    localStorage.getItem('admin_token') || 
                    localStorage.getItem('token');
      
      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`/api/flagship-sanctuary/${sessionId}/breakout-rooms/${roomId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-auth-token': token,
          'auth-token': token
        }
      });

      if (response.ok) {
        // Remove from cache
        this.roomCache.delete(roomId);
        return { success: true };
      } else {
        const errorText = await response.text();
        console.error('❌ Delete room failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Flagship Breakout Service: Delete room failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete room'
      };
    }
  }

  /**
   * 🔄 Auto-assign participants to breakout rooms
   */
  async autoAssignParticipants(sessionId: string): Promise<{
    success: boolean;
    assignedCount?: number;
    totalRooms?: number;
    error?: string;
  }> {
    try {
      console.log('🔄 Flagship Breakout Service: Auto-assigning participants:', sessionId);

      // Get the most current token
      const token = localStorage.getItem('veilo-auth-token') || 
                    localStorage.getItem('admin_token') || 
                    localStorage.getItem('token');
      
      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`/api/flagship-sanctuary/${sessionId}/breakout-rooms/auto-assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-auth-token': token,
          'auth-token': token
        }
      });

      if (response.ok) {
        const data = await response.json();
        return { 
          success: true, 
          assignedCount: data.data?.assignedCount,
          totalRooms: data.data?.totalRooms
        };
      } else {
        const errorText = await response.text();
        console.error('❌ Auto-assign failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Flagship Breakout Service: Auto-assign failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to auto-assign participants'
      };
    }
  }

  /**
   * 📊 Get room statistics
   */
  getRoomStatistics(roomId: string) {
    const room = this.roomCache.get(roomId);
    if (!room) return null;

    return {
      participantCount: room.participants.length,
      maxParticipants: room.maxParticipants,
      occupancyRate: (room.participants.length / room.maxParticipants) * 100,
      activeParticipants: room.participants.filter(p => p.isConnected).length,
      mutedParticipants: room.participants.filter(p => p.isMuted).length,
      createdAt: room.createdAt,
      status: room.status
    };
  }

  /**
   * 🎧 Add event listener
   */
  addEventListener(event: string, callback: Function) {
    this.eventListeners.set(event, callback);
    enhancedSocketService.on(event, callback as any);
  }

  /**
   * 🔇 Remove event listener
   */
  removeEventListener(event: string) {
    const callback = this.eventListeners.get(event);
    if (callback) {
      enhancedSocketService.off(event, callback as any);
      this.eventListeners.delete(event);
    }
  }

  /**
   * 📈 Get connection metrics
   */
  getMetrics() {
    return {
      ...this.connectionMetrics,
      cachedRooms: this.roomCache.size,
      activeListeners: this.eventListeners.size,
      socketConnected: enhancedSocketService.connected
    };
  }

  /**
   * 🔄 Private: Create room via HTTP API (fallback)
   */
  private async createRoomViaAPI(sessionId: string, roomConfig: CreateRoomConfig) {
    // Get the most current token using enhanced auth utils
    const token = getCurrentAuthToken();
    
    if (!token) {
      debugAuthState(); // Debug auth state for troubleshooting
      throw new Error('No authentication token available');
    }

    if (!isTokenValid(token)) {
      debugAuthState(); // Debug auth state for troubleshooting
      throw new Error('Authentication token is invalid or expired');
    }

    console.log('🔐 Creating room with enhanced auth:', {
      hasToken: !!token,
      tokenLength: token.length,
      tokenPrefix: token.substring(0, 20) + '...',
      isValid: isTokenValid(token)
    });

    // Build payload using backend's expected schema (nested settings)
    const user = getUserFromToken();
    const facilitatorId = user?.id || user?._id || user?.userId;

    const config = {
      name: roomConfig.name,
      topic: roomConfig.topic,
      maxParticipants: roomConfig.maxParticipants,
      facilitatorId,
      duration: roomConfig.duration,
      autoClose: roomConfig.autoClose ?? true,
      // Backend expects feature toggles under settings
      settings: {
        allowTextChat: roomConfig.allowTextChat ?? true,
        allowVoiceChat: roomConfig.allowVoiceChat ?? true,
        allowScreenShare: roomConfig.allowScreenShare ?? false,
        moderationEnabled: roomConfig.moderationEnabled ?? true,
        recordingEnabled: roomConfig.recordingEnabled ?? false,
        voiceModulationEnabled: false,
        allowReactions: true,
        allowPolls: false
      }
    } as const;

    try {
      // Use dedicated backend adapter which matches server schema
      const backendRes = await flagshipBreakoutBackend.createBreakoutRoom(sessionId, config as any);
      if (backendRes.success && backendRes.room) {
        this.roomCache.set(backendRes.room.id, backendRes.room as any);
        return { success: true, room: backendRes.room as any };
      }

      console.error('❌ Room creation via backend adapter failed:', backendRes.error);

      // Fallback to API service (some deployments still accept flat payload)
      const fallbackPayload = { ...config, hostId: facilitatorId, sessionId } as any;
      const res = await FlagshipSanctuaryApi.createBreakoutRoom(sessionId, fallbackPayload);
      if (res.success) {
        const room = (res as any).room || (res.data as any)?.room || (res.data as any);
        if (room?.id) {
          this.roomCache.set(room.id, room);
        }
        return { success: true, room };
      }

      console.error('❌ Room creation via API failed:', res.error);

      // If the modern endpoint is unavailable (404), try legacy route as fallback
      if (typeof res.error === 'string' && /404|Not Found/i.test(res.error)) {
        console.warn('⚠️ Breakout create 404 on modern route, attempting legacy /breakout-rooms endpoint');
        const legacyPayload = {
          name: roomConfig.name,
          maxParticipants: roomConfig.maxParticipants,
          facilitatorId,
          sessionId
        } as any;

        const legacyResp = await fetch(`/api/flagship-sanctuary/${sessionId}/breakout-rooms`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify(legacyPayload),
        });

        if (legacyResp.ok) {
          const data = await legacyResp.json();
          const room = data.data?.room || data.room || data;
          if (room?.id) this.roomCache.set(room.id, room);
          return { success: true, room };
        }

        const txt = await legacyResp.text();
        console.error('❌ Legacy breakout create failed:', { status: legacyResp.status, statusText: legacyResp.statusText, error: txt });

        // Some backends create the room but return 5xx; poll to confirm existence by name
        const possiblyCreated = await this.pollForRoomByName(sessionId, roomConfig.name, 6, 1000);
        if (possiblyCreated) {
          this.roomCache.set(possiblyCreated.id, possiblyCreated);
          console.warn('⚠️ Legacy API returned error but room exists; treating as success');
          return { success: true, room: possiblyCreated };
        }

        throw new Error(`HTTP ${legacyResp.status}: ${legacyResp.statusText}`);
      }

      throw new Error(res.error || 'API returned failure creating room');
    } catch (err) {
      console.error('❌ Room creation API exception:', err);
      throw err instanceof Error ? err : new Error('Unexpected error creating room');
    }
  }

  /**
   * 🚪 Private: Join room via HTTP API (fallback)
   */
  private async joinRoomViaAPI(roomId: string, participantData: any) {
    // Extract session ID from room ID (assuming format: breakout_sessionId_roomId)
    const sessionId = roomId.split('_')[1];
    
    // Get the most current token
    const token = localStorage.getItem('veilo-auth-token') || 
                  localStorage.getItem('admin_token') || 
                  localStorage.getItem('token');
    
    if (!token) {
      throw new Error('No authentication token available');
    }
    
    const response = await fetch(`/api/flagship-sanctuary/${sessionId}/breakout-rooms/${roomId}/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-auth-token': token,
        'auth-token': token
      },
      body: JSON.stringify(participantData)
    });

    if (response.ok) {
      const data = await response.json();
      const room = data.data?.room || data.room;
      
      if (room) {
        this.roomCache.set(room.id, room);
      }
      
      return { success: true, room };
    } else {
      const errorText = await response.text();
      console.error('❌ Join room via API failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }

  /**
   * 🎧 Private: Setup event listeners
   */
  private setupEventListeners() {
    // Room creation events
    enhancedSocketService.on('breakout_room_created', (data: any) => {
      console.log('🏠 Flagship Breakout Service: Room created event:', data);
      if (data.room) {
        this.roomCache.set(data.room.id, data.room);
      }
    });

    // Room join events
    enhancedSocketService.on('breakout_room_join_success', (data: any) => {
      console.log('✅ Flagship Breakout Service: Room join success:', data);
      if (data.room) {
        this.roomCache.set(data.room.id, data.room);
      }
    });

    // Participant events
    enhancedSocketService.on('breakout_participant_joined', (data: any) => {
      console.log('👤 Flagship Breakout Service: Participant joined:', data);
      if (data.room) {
        this.roomCache.set(data.room.id, data.room);
      }
    });

    enhancedSocketService.on('breakout_participant_left', (data: any) => {
      console.log('👤 Flagship Breakout Service: Participant left:', data);
      // Update cache if room data is provided
      if (data.room) {
        this.roomCache.set(data.room.id, data.room);
      }
    });

    // Room closure events
    enhancedSocketService.on('breakout_room_closed', (data: any) => {
      console.log('🗑️ Flagship Breakout Service: Room closed:', data);
      if (data.roomId) {
        this.roomCache.delete(data.roomId);
      }
    });

    // Error events
    enhancedSocketService.on('breakout_room_create_error', (error: any) => {
      console.error('❌ Flagship Breakout Service: Create error:', error);
    });

    enhancedSocketService.on('breakout_room_join_error', (error: any) => {
      console.error('❌ Flagship Breakout Service: Join error:', error);
    });
  }

  // 🔎 Poll for room existence by name (handles eventual consistency on error responses)
  private async pollForRoomByName(
    sessionId: string,
    name: string,
    maxAttempts = 6,
    intervalMs = 1000
  ): Promise<BreakoutRoom | null> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const resp = await this.getBreakoutRooms(sessionId);
        if (resp.success && resp.rooms) {
          const match = resp.rooms.find(r => r.name === name);
          if (match) return match;
        }
      } catch (e) {
        // ignore and retry
      }
      await new Promise(res => setTimeout(res, intervalMs));
    }
    return null;
  }
}


// Create singleton instance
const flagshipBreakoutService = new FlagshipBreakoutService();

export default flagshipBreakoutService;
export { FlagshipBreakoutService };
export type { BreakoutRoom, CreateRoomConfig };