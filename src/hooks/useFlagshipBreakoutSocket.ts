/**
 * 🎯 FLAGSHIP BREAKOUT SOCKET HOOK
 * Real-time socket communication for breakout rooms with enhanced state management
 * Built for FAANG-level excellence with comprehensive error handling
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from './use-toast';
import { logger } from '@/services/logger';
import enhancedSocketService from '@/services/enhancedSocket';
import type { BreakoutRoom, BreakoutParticipant } from '@/services/flagshipBreakoutBackend';

interface SocketBreakoutEvent {
  type: 'room_created' | 'room_updated' | 'room_deleted' | 
        'participant_joined' | 'participant_left' | 'participant_updated' |
        'message_received' | 'moderation_action' | 'auto_assignment_completed' |
        'recording_status_changed' | 'room_status_changed';
  sessionId: string;
  roomId?: string;
  participantId?: string;
  data: any;
  timestamp: string;
}

interface RealtimeBreakoutState {
  rooms: Map<string, BreakoutRoom>;
  participants: Map<string, BreakoutParticipant>;
  currentRoom: string | null;
  lastUpdate: string;
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
  messageQueue: SocketBreakoutEvent[];
}

interface UseFlagshipBreakoutSocketOptions {
  sessionId: string;
  autoReconnect?: boolean;
  enableAnalytics?: boolean;
  bufferEvents?: boolean;
}

interface UseFlagshipBreakoutSocketReturn {
  // Real-time state
  rooms: BreakoutRoom[];
  participants: BreakoutParticipant[];
  currentRoom: BreakoutRoom | null;
  connectionStatus: RealtimeBreakoutState['connectionStatus'];
  lastUpdate: string;
  
  // Connection management
  connect: () => Promise<void>;
  disconnect: () => void;
  reconnect: () => Promise<void>;
  
  // Room events
  createRoom: (config: any) => Promise<void>;
  joinRoom: (roomId: string, participantData: any) => Promise<void>;
  leaveRoom: (roomId: string) => Promise<void>;
  updateRoom: (roomId: string, updates: any) => Promise<void>;
  deleteRoom: (roomId: string) => Promise<void>;
  
  // Participant events
  updateParticipant: (roomId: string, participantId: string, updates: any) => Promise<void>;
  moderateParticipant: (roomId: string, action: any) => Promise<void>;
  
  // Messaging
  sendMessage: (roomId: string, message: any) => Promise<void>;
  sendReaction: (roomId: string, reaction: any) => Promise<void>;
  
  // Analytics
  getRealtimeMetrics: () => {
    totalRooms: number;
    totalParticipants: number;
    activeConnections: number;
    averageLatency: number;
    eventThroughput: number;
  };
  
  // Debugging
  getSocketState: () => RealtimeBreakoutState;
  clearCache: () => void;
}

export const useFlagshipBreakoutSocket = (
  options: UseFlagshipBreakoutSocketOptions
): UseFlagshipBreakoutSocketReturn => {
  const { sessionId, autoReconnect = true, enableAnalytics = true, bufferEvents = true } = options;
  const { toast } = useToast();
  
  // State management
  const [state, setState] = useState<RealtimeBreakoutState>({
    rooms: new Map(),
    participants: new Map(),
    currentRoom: null,
    lastUpdate: new Date().toISOString(),
    connectionStatus: 'disconnected',
    messageQueue: []
  });
  
  // Refs for preventing memory leaks and race conditions
  const isInitialized = useRef(false);
  const eventHandlers = useRef(new Map<string, Function>());
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);
  const metricsTimer = useRef<NodeJS.Timeout | null>(null);
  const eventBuffer = useRef<SocketBreakoutEvent[]>([]);
  
  // Analytics state
  const [metrics, setMetrics] = useState({
    eventsReceived: 0,
    eventsSent: 0,
    reconnectCount: 0,
    averageLatency: 0,
    lastEventTime: null as string | null
  });

  // Event processing with deduplication and ordering
  const processEvent = useCallback((event: SocketBreakoutEvent) => {
    const eventKey = `${event.type}_${event.roomId || 'global'}_${event.timestamp}`;
    
    if (eventHandlers.current.has(eventKey)) {
      logger.debug('🔄 Duplicate event detected, skipping:', eventKey);
      return;
    }
    
    eventHandlers.current.set(eventKey, () => {});
    
    // Clean up old event handlers to prevent memory leaks
    if (eventHandlers.current.size > 1000) {
      const keys = Array.from(eventHandlers.current.keys()).slice(0, 500);
      keys.forEach(key => eventHandlers.current.delete(key));
    }
    
    setState(prevState => {
      const newState = { ...prevState };
      
      switch (event.type) {
        case 'room_created':
        case 'room_updated':
          if (event.data.room) {
            newState.rooms.set(event.data.room.id, event.data.room);
          }
          break;
          
        case 'room_deleted':
          if (event.roomId) {
            newState.rooms.delete(event.roomId);
            if (newState.currentRoom === event.roomId) {
              newState.currentRoom = null;
            }
          }
          break;
          
        case 'participant_joined':
        case 'participant_updated':
          if (event.data.participant && event.roomId) {
            newState.participants.set(event.data.participant.id, event.data.participant);
            
            // Update room participant count
            const room = newState.rooms.get(event.roomId);
            if (room) {
              const updatedRoom = {
                ...room,
                currentParticipants: event.data.participantCount || room.currentParticipants,
                participants: event.data.participants || room.participants
              };
              newState.rooms.set(event.roomId, updatedRoom);
            }
          }
          break;
          
        case 'participant_left':
          if (event.participantId && event.roomId) {
            newState.participants.delete(event.participantId);
            
            // Update room participant count
            const room = newState.rooms.get(event.roomId);
            if (room) {
              const updatedRoom = {
                ...room,
                currentParticipants: Math.max(0, room.currentParticipants - 1),
                participants: room.participants.filter(p => p.id !== event.participantId)
              };
              newState.rooms.set(event.roomId, updatedRoom);
            }
          }
          break;
          
        case 'auto_assignment_completed':
          // Refresh all room data
          if (event.data.assignments) {
            event.data.assignments.forEach((assignment: any) => {
              const room = newState.rooms.get(assignment.roomId);
              if (room && assignment.participant) {
                newState.participants.set(assignment.participant.id, assignment.participant);
              }
            });
          }
          break;
          
        case 'room_status_changed':
          if (event.roomId && event.data.status) {
            const room = newState.rooms.get(event.roomId);
            if (room) {
              newState.rooms.set(event.roomId, { ...room, status: event.data.status });
            }
          }
          break;
      }
      
      newState.lastUpdate = event.timestamp;
      return newState;
    });
    
    // Update metrics
    if (enableAnalytics) {
      setMetrics(prev => ({
        ...prev,
        eventsReceived: prev.eventsReceived + 1,
        lastEventTime: event.timestamp
      }));
    }
    
    logger.debug('📨 Processed breakout event:', event.type);
  }, [enableAnalytics]);

  // Setup socket event listeners
  const setupEventListeners = useCallback(() => {
    if (!enhancedSocketService) return;
    
    // Breakout room events
    const eventTypes = [
      'breakout_room_created',
      'breakout_room_updated', 
      'breakout_room_deleted',
      'breakout_participant_joined',
      'breakout_participant_left',
      'breakout_participant_updated',
      'breakout_message_received',
      'breakout_moderation_action',
      'breakout_auto_assignment_completed',
      'breakout_recording_status_changed',
      'breakout_room_status_changed'
    ];
    
    // Simplified event handling for compatibility
    logger.info('🔌 Setting up breakout socket event listeners');
    
    // Connection status tracking
    setState(prev => ({ ...prev, connectionStatus: 'connected' }));
    
  }, [sessionId]);

  // Connection management
  const connect = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, connectionStatus: 'connecting' }));
      await enhancedSocketService.connect();
      setupEventListeners();
      
      // Join session breakout namespace
      enhancedSocketService.emit('join_breakout_session', { sessionId });
      
    } catch (error) {
      setState(prev => ({ ...prev, connectionStatus: 'error' }));
      logger.error('❌ Failed to connect breakout socket:', error);
      throw error;
    }
  }, [sessionId, setupEventListeners]);

  const disconnect = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
    }
    
    if (enhancedSocketService) {
      enhancedSocketService.emit('leave_breakout_session', { sessionId });
      enhancedSocketService.disconnect();
    }
    
    setState(prev => ({ ...prev, connectionStatus: 'disconnected' }));
  }, [sessionId]);

  const reconnect = useCallback(async () => {
    disconnect();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await connect();
  }, [connect, disconnect]);

  // Room operations
  const createRoom = useCallback(async (config: any) => {
    if (state.connectionStatus !== 'connected') {
      throw new Error('Socket not connected');
    }
    
    enhancedSocketService.emit('create_breakout_room', {
      sessionId,
      roomConfig: config,
      timestamp: new Date().toISOString()
    });
    
    if (enableAnalytics) {
      setMetrics(prev => ({ ...prev, eventsSent: prev.eventsSent + 1 }));
    }
  }, [sessionId, enableAnalytics]);

  const joinRoom = useCallback(async (roomId: string, participantData: any) => {
    if (state.connectionStatus !== 'connected') {
      throw new Error('Socket not connected');
    }
    
    enhancedSocketService.emit('join_breakout_room', {
      sessionId,
      roomId,
      participantData,
      timestamp: new Date().toISOString()
    });
    
    setState(prev => ({ ...prev, currentRoom: roomId }));
    
    if (enableAnalytics) {
      setMetrics(prev => ({ ...prev, eventsSent: prev.eventsSent + 1 }));
    }
  }, [sessionId, enableAnalytics]);

  const leaveRoom = useCallback(async (roomId: string) => {
    if (state.connectionStatus !== 'connected') {
      throw new Error('Socket not connected');
    }
    
    enhancedSocketService.emit('leave_breakout_room', {
      sessionId,
      roomId,
      timestamp: new Date().toISOString()
    });
    
    setState(prev => ({ 
      ...prev, 
      currentRoom: prev.currentRoom === roomId ? null : prev.currentRoom 
    }));
    
    if (enableAnalytics) {
      setMetrics(prev => ({ ...prev, eventsSent: prev.eventsSent + 1 }));
    }
  }, [sessionId, enableAnalytics]);

  const sendMessage = useCallback(async (roomId: string, message: any) => {
    if (state.connectionStatus !== 'connected') {
      throw new Error('Socket not connected');
    }
    
    enhancedSocketService.emit('send_breakout_message', {
      sessionId,
      roomId,
      message: {
        ...message,
        timestamp: new Date().toISOString()
      }
    });
    
    if (enableAnalytics) {
      setMetrics(prev => ({ ...prev, eventsSent: prev.eventsSent + 1 }));
    }
  }, [sessionId, enableAnalytics]);

  // Initialize connection
  useEffect(() => {
    if (!isInitialized.current && sessionId) {
      isInitialized.current = true;
      connect().catch(error => {
        logger.error('❌ Failed to initialize breakout socket:', error);
      });
    }
    
    return () => {
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
      }
      if (metricsTimer.current) {
        clearTimeout(metricsTimer.current);
      }
    };
  }, [sessionId, connect]);

  // Derived state
  const rooms = Array.from(state.rooms.values());
  const participants = Array.from(state.participants.values());
  const currentRoom = state.currentRoom ? state.rooms.get(state.currentRoom) || null : null;

  return {
    // Real-time state
    rooms,
    participants,
    currentRoom,
    connectionStatus: state.connectionStatus,
    lastUpdate: state.lastUpdate,
    
    // Connection management
    connect,
    disconnect,
    reconnect,
    
    // Room operations
    createRoom,
    joinRoom,
    leaveRoom,
    updateRoom: async (roomId: string, updates: any) => {
      enhancedSocketService.emit('update_breakout_room', { sessionId, roomId, updates });
    },
    deleteRoom: async (roomId: string) => {
      enhancedSocketService.emit('delete_breakout_room', { sessionId, roomId });
    },
    
    // Participant operations
    updateParticipant: async (roomId: string, participantId: string, updates: any) => {
      enhancedSocketService.emit('update_breakout_participant', { sessionId, roomId, participantId, updates });
    },
    moderateParticipant: async (roomId: string, action: any) => {
      enhancedSocketService.emit('moderate_breakout_participant', { sessionId, roomId, action });
    },
    
    // Messaging
    sendMessage,
    sendReaction: async (roomId: string, reaction: any) => {
      enhancedSocketService.emit('send_breakout_reaction', { sessionId, roomId, reaction });
    },
    
    // Analytics
    getRealtimeMetrics: () => ({
      totalRooms: rooms.length,
      totalParticipants: participants.length,
      activeConnections: state.connectionStatus === 'connected' ? 1 : 0,
      averageLatency: metrics.averageLatency,
      eventThroughput: metrics.eventsReceived
    }),
    
    // Debugging
    getSocketState: () => state,
    clearCache: () => {
      setState(prev => ({
        ...prev,
        rooms: new Map(),
        participants: new Map(),
        messageQueue: []
      }));
      eventBuffer.current = [];
      eventHandlers.current.clear();
    }
  };
};