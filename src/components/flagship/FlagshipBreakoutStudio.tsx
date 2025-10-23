/**
 * 🎯 FLAGSHIP BREAKOUT STUDIO
 * Advanced breakout room management interface with real-time features
 * Designed to surpass FAANG-level excellence
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useFlagshipBreakoutSocket } from '@/hooks/useFlagshipBreakoutSocket';
import { flagshipBreakoutBackend, type BreakoutRoomConfig } from '@/services/flagshipBreakoutBackend';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Plus, ArrowRight, X, Shuffle, Clock, Settings, Crown, UserCheck, 
  Loader2, CheckCircle, AlertCircle, Grid3X3, Mic, MicOff, Video, VideoOff,
  MessageSquare, Share2, Activity, BarChart3, Zap, Shield, Play, Pause,
  Circle, StopCircle, Volume2, Headphones, Eye, EyeOff, Target, 
  TrendingUp, Sparkles, Layers, Network, Cpu, Database
} from 'lucide-react';

interface FlagshipBreakoutStudioProps {
  sessionId: string;
  currentUser: {
    id: string;
    alias: string;
    isHost: boolean;
    isModerator: boolean;
    avatarIndex: number;
  };
  participants: Array<{
    id: string;
    alias: string;
    avatarIndex: number;
    isHost: boolean;
    isModerator: boolean;
    isConnected: boolean;
  }>;
  onParticipantAssigned?: (assignments: any[]) => void;
}

export const FlagshipBreakoutStudio: React.FC<FlagshipBreakoutStudioProps> = ({
  sessionId,
  currentUser,
  participants,
  onParticipantAssigned
}) => {
  const { toast } = useToast();
  
  // Socket integration for real-time updates
  const {
    rooms,
    currentRoom,
    connectionStatus,
    connect,
    disconnect,
    createRoom: socketCreateRoom,
    joinRoom: socketJoinRoom,
    leaveRoom: socketLeaveRoom,
    getRealtimeMetrics
  } = useFlagshipBreakoutSocket({ 
    sessionId,
    enableAnalytics: true,
    autoReconnect: true 
  });
  
  // UI state
  const [activeTab, setActiveTab] = useState<'rooms' | 'analytics' | 'settings'>('rooms');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedRoomForEdit, setSelectedRoomForEdit] = useState<string | null>(null);
  const [autoAssignInProgress, setAutoAssignInProgress] = useState(false);
  
  // Room creation form
  const [roomForm, setRoomForm] = useState<Partial<BreakoutRoomConfig>>({
    name: '',
    topic: '',
    description: '',
    maxParticipants: 6,
    settings: {
      allowTextChat: true,
      allowVoiceChat: true,
      allowScreenShare: false,
      moderationEnabled: true,
      recordingEnabled: false,
      voiceModulationEnabled: false,
      allowReactions: true,
      allowPolls: false
    },
    duration: 15,
    autoClose: true,
    isPrivate: false,
    requiresApproval: false,
    tags: []
  });
  
  // Advanced settings
  const [advancedSettings, setAdvancedSettings] = useState({
    autoAssignStrategy: 'balanced' as 'balanced' | 'random' | 'skill-based',
    enableAIModeration: true,
    recordingQuality: 'high' as 'low' | 'medium' | 'high' | 'ultra',
    networkOptimization: true,
    realtimeAnalytics: true
  });

  // Get real-time metrics
  const metrics = getRealtimeMetrics();

  // Handle room creation with enhanced validation
  const handleCreateRoom = useCallback(async () => {
    if (!roomForm.name?.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a room name",
        variant: "destructive"
      });
      return;
    }

    if (roomForm.name.trim().length < 2) {
      toast({
        title: "Name Too Short", 
        description: "Room name must be at least 2 characters",
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);

    try {
      const config: BreakoutRoomConfig = {
        name: roomForm.name.trim(),
        topic: roomForm.topic?.trim(),
        description: roomForm.description?.trim(),
        maxParticipants: roomForm.maxParticipants || 6,
        facilitatorId: currentUser.id,
        settings: roomForm.settings!,
        duration: roomForm.duration,
        autoClose: roomForm.autoClose,
        isPrivate: roomForm.isPrivate,
        requiresApproval: roomForm.requiresApproval,
        tags: roomForm.tags || []
      };

      // Create via backend API first
      const result = await flagshipBreakoutBackend.createBreakoutRoom(sessionId, config);
      
      if (result.success) {
        // Then sync via socket for real-time updates
        await socketCreateRoom(config);
        
        setIsCreateDialogOpen(false);
        resetRoomForm();
        
        toast({
          title: "Room Created",
          description: `"${config.name}" is ready for participants`,
          duration: 3000
        });
      } else {
        throw new Error(result.error || 'Failed to create room');
      }
      
    } catch (error) {
      console.error('❌ Room creation failed:', error);
      toast({
        title: "Creation Failed",
        description: error instanceof Error ? error.message : "Could not create breakout room",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  }, [roomForm, sessionId, currentUser.id, socketCreateRoom, toast]);

  // Reset room form
  const resetRoomForm = useCallback(() => {
    setRoomForm({
      name: '',
      topic: '',
      description: '',
      maxParticipants: 6,
      settings: {
        allowTextChat: true,
        allowVoiceChat: true,
        allowScreenShare: false,
        moderationEnabled: true,
        recordingEnabled: false,
        voiceModulationEnabled: false,
        allowReactions: true,
        allowPolls: false
      },
      duration: 15,
      autoClose: true,
      isPrivate: false,
      requiresApproval: false,
      tags: []
    });
  }, []);

  // Handle auto-assignment
  const handleAutoAssign = useCallback(async () => {
    if (rooms.length === 0) {
      toast({
        title: "No Rooms Available",
        description: "Create breakout rooms first",
        variant: "destructive"
      });
      return;
    }

    setAutoAssignInProgress(true);

    try {
      const result = await flagshipBreakoutBackend.autoAssignParticipants(
        sessionId,
        advancedSettings.autoAssignStrategy
      );

      if (result.success && result.assignments) {
        toast({
          title: "Auto-Assignment Complete",
          description: `${result.assignments.length} participants assigned`,
          duration: 3000
        });
        
        onParticipantAssigned?.(result.assignments);
      } else {
        throw new Error(result.error || 'Auto-assignment failed');
      }
      
    } catch (error) {
      console.error('❌ Auto-assignment failed:', error);
      toast({
        title: "Assignment Failed",
        description: error instanceof Error ? error.message : "Could not assign participants",
        variant: "destructive"
      });
    } finally {
      setAutoAssignInProgress(false);
    }
  }, [rooms.length, sessionId, advancedSettings.autoAssignStrategy, toast, onParticipantAssigned]);

  // Join room handler
  const handleJoinRoom = useCallback(async (roomId: string) => {
    try {
      await socketJoinRoom(roomId, {
        id: currentUser.id,
        alias: currentUser.alias,
        avatarIndex: currentUser.avatarIndex,
        role: currentUser.isHost || currentUser.isModerator ? 'facilitator' : 'participant'
      });
      
      toast({
        title: "Joining Room",
        description: "Connecting to breakout room...",
        duration: 2000
      });
      
    } catch (error) {
      console.error('❌ Join failed:', error);
      toast({
        title: "Join Failed",
        description: "Could not join breakout room",
        variant: "destructive"
      });
    }
  }, [currentUser, socketJoinRoom, toast]);

  // Connection status indicator
  const ConnectionIndicator = () => (
    <div className="flex items-center space-x-2">
      <div className={`w-2 h-2 rounded-full ${
        connectionStatus === 'connected' ? 'bg-green-500' : 
        connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 
        'bg-red-500'
      }`} />
      <span className="text-xs text-muted-foreground">
        {connectionStatus === 'connected' ? 'Live' : 
         connectionStatus === 'connecting' ? 'Connecting...' : 
         'Offline'}
      </span>
      {connectionStatus === 'connected' && (
        <Badge variant="secondary" className="text-xs">
          {metrics.totalRooms} rooms
        </Badge>
      )}
    </div>
  );

  // Room card component
  const RoomCard = ({ room }: { room: any }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="relative group hover:shadow-lg transition-all duration-200">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg flex items-center space-x-2">
                <span>{room.name}</span>
                <Badge variant={room.status === 'active' ? 'default' : 'secondary'}>
                  {room.status}
                </Badge>
              </CardTitle>
              {room.topic && (
                <p className="text-sm text-muted-foreground mt-1">{room.topic}</p>
              )}
            </div>
            
            <div className="flex items-center space-x-1">
              {room.settings?.allowVoiceChat && <Mic className="h-4 w-4 text-green-500" />}
              {room.settings?.allowTextChat && <MessageSquare className="h-4 w-4 text-blue-500" />}
              {room.settings?.allowScreenShare && <Share2 className="h-4 w-4 text-purple-500" />}
              {room.settings?.recordingEnabled && <Circle className="h-4 w-4 text-red-500" />}
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Participants</span>
              <span className="font-medium">
                {room.currentParticipants || 0} / {room.maxParticipants}
              </span>
            </div>
            
            {room.participants && room.participants.length > 0 && (
              <div className="flex -space-x-2">
                {room.participants.slice(0, 5).map((participant: any, index: number) => (
                  <Avatar key={participant.id} className="w-6 h-6 border-2 border-white">
                    <AvatarFallback className="text-xs">
                      {participant.alias?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {room.participants.length > 5 && (
                  <div className="w-6 h-6 rounded-full bg-muted border-2 border-white flex items-center justify-center">
                    <span className="text-xs">+{room.participants.length - 5}</span>
                  </div>
                )}
              </div>
            )}
            
            <div className="flex justify-between items-center pt-2">
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{room.duration || 15} min</span>
              </div>
              
              <div className="flex space-x-2">
                {currentRoom?.id === room.id ? (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => socketLeaveRoom(room.id)}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Leave
                  </Button>
                ) : (
                  <Button 
                    size="sm" 
                    onClick={() => handleJoinRoom(room.id)}
                    disabled={room.currentParticipants >= room.maxParticipants}
                  >
                    <ArrowRight className="h-3 w-3 mr-1" />
                    Join
                  </Button>
                )}
                
                {(currentUser.isHost || currentUser.isModerator) && (
                  <Button size="sm" variant="ghost" onClick={() => setSelectedRoomForEdit(room.id)}>
                    <Settings className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Layers className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <span>Flagship Breakout Studio</span>
                  <Sparkles className="h-5 w-5 text-yellow-500" />
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Advanced breakout room management with real-time synchronization
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <ConnectionIndicator />
              
              {(currentUser.isHost || currentUser.isModerator) && (
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAutoAssign}
                    disabled={autoAssignInProgress || rooms.length === 0}
                  >
                    {autoAssignInProgress ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Shuffle className="h-4 w-4 mr-1" />
                    )}
                    Auto-Assign
                  </Button>
                  
                  <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" disabled={isCreating}>
                        {isCreating ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4 mr-1" />
                        )}
                        Create Room
                      </Button>
                    </DialogTrigger>
                    
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="flex items-center space-x-2">
                          <Zap className="h-5 w-5 text-primary" />
                          <span>Create Flagship Breakout Room</span>
                        </DialogTitle>
                        <DialogDescription>
                          Design a powerful collaborative space with advanced features and real-time synchronization.
                        </DialogDescription>
                      </DialogHeader>
                      
                      <Tabs defaultValue="basic" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                          <TabsTrigger value="basic">Basic Info</TabsTrigger>
                          <TabsTrigger value="settings">Settings</TabsTrigger>
                          <TabsTrigger value="advanced">Advanced</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="basic" className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium mb-2">Room Name *</label>
                            <Input
                              value={roomForm.name || ''}
                              onChange={(e) => setRoomForm(prev => ({ ...prev, name: e.target.value }))}
                              placeholder="Enter room name..."
                              maxLength={50}
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium mb-2">Topic</label>
                            <Input
                              value={roomForm.topic || ''}
                              onChange={(e) => setRoomForm(prev => ({ ...prev, topic: e.target.value }))}
                              placeholder="What will be discussed..."
                              maxLength={100}
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium mb-2">Description</label>
                            <Textarea
                              value={roomForm.description || ''}
                              onChange={(e) => setRoomForm(prev => ({ ...prev, description: e.target.value }))}
                              placeholder="Detailed description of the breakout room purpose..."
                              maxLength={500}
                              rows={3}
                            />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium mb-2">Max Participants</label>
                              <Select
                                value={roomForm.maxParticipants?.toString() || '6'}
                                onValueChange={(value) => setRoomForm(prev => ({ 
                                  ...prev, 
                                  maxParticipants: parseInt(value) 
                                }))}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {[2, 3, 4, 5, 6, 8, 10, 12, 15, 20].map(num => (
                                    <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium mb-2">Duration (min)</label>
                              <Select
                                value={roomForm.duration?.toString() || '15'}
                                onValueChange={(value) => setRoomForm(prev => ({ 
                                  ...prev, 
                                  duration: parseInt(value) 
                                }))}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {[5, 10, 15, 20, 30, 45, 60, 90, 120].map(num => (
                                    <SelectItem key={num} value={num.toString()}>{num} min</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="settings" className="space-y-4">
                          <div className="space-y-4">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-medium">Voice Chat</p>
                                <p className="text-sm text-muted-foreground">Allow participants to speak</p>
                              </div>
                              <Switch
                                checked={roomForm.settings?.allowVoiceChat || false}
                                onCheckedChange={(checked) => setRoomForm(prev => ({
                                  ...prev,
                                  settings: { ...prev.settings!, allowVoiceChat: checked }
                                }))}
                              />
                            </div>
                            
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-medium">Text Chat</p>
                                <p className="text-sm text-muted-foreground">Enable messaging</p>
                              </div>
                              <Switch
                                checked={roomForm.settings?.allowTextChat !== false}
                                onCheckedChange={(checked) => setRoomForm(prev => ({
                                  ...prev,
                                  settings: { ...prev.settings!, allowTextChat: checked }
                                }))}
                              />
                            </div>
                            
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-medium">Screen Share</p>
                                <p className="text-sm text-muted-foreground">Allow screen sharing</p>
                              </div>
                              <Switch
                                checked={roomForm.settings?.allowScreenShare || false}
                                onCheckedChange={(checked) => setRoomForm(prev => ({
                                  ...prev,
                                  settings: { ...prev.settings!, allowScreenShare: checked }
                                }))}
                              />
                            </div>
                            
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-medium">Reactions</p>
                                <p className="text-sm text-muted-foreground">Enable emoji reactions</p>
                              </div>
                              <Switch
                                checked={roomForm.settings?.allowReactions !== false}
                                onCheckedChange={(checked) => setRoomForm(prev => ({
                                  ...prev,
                                  settings: { ...prev.settings!, allowReactions: checked }
                                }))}
                              />
                            </div>
                            
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-medium">Recording</p>
                                <p className="text-sm text-muted-foreground">Record the session</p>
                              </div>
                              <Switch
                                checked={roomForm.settings?.recordingEnabled || false}
                                onCheckedChange={(checked) => setRoomForm(prev => ({
                                  ...prev,
                                  settings: { ...prev.settings!, recordingEnabled: checked }
                                }))}
                              />
                            </div>
                            
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-medium">AI Moderation</p>
                                <p className="text-sm text-muted-foreground">Automatic content moderation</p>
                              </div>
                              <Switch
                                checked={roomForm.settings?.moderationEnabled !== false}
                                onCheckedChange={(checked) => setRoomForm(prev => ({
                                  ...prev,
                                  settings: { ...prev.settings!, moderationEnabled: checked }
                                }))}
                              />
                            </div>
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="advanced" className="space-y-4">
                          <div className="space-y-4">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-medium">Private Room</p>
                                <p className="text-sm text-muted-foreground">Require invitation to join</p>
                              </div>
                              <Switch
                                checked={roomForm.isPrivate || false}
                                onCheckedChange={(checked) => setRoomForm(prev => ({
                                  ...prev,
                                  isPrivate: checked
                                }))}
                              />
                            </div>
                            
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-medium">Approval Required</p>
                                <p className="text-sm text-muted-foreground">Host must approve participants</p>
                              </div>
                              <Switch
                                checked={roomForm.requiresApproval || false}
                                onCheckedChange={(checked) => setRoomForm(prev => ({
                                  ...prev,
                                  requiresApproval: checked
                                }))}
                              />
                            </div>
                            
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-medium">Auto-Close</p>
                                <p className="text-sm text-muted-foreground">Automatically end after duration</p>
                              </div>
                              <Switch
                                checked={roomForm.autoClose !== false}
                                onCheckedChange={(checked) => setRoomForm(prev => ({
                                  ...prev,
                                  autoClose: checked
                                }))}
                              />
                            </div>
                            
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-medium">Voice Modulation</p>
                                <p className="text-sm text-muted-foreground">Enable voice effects</p>
                              </div>
                              <Switch
                                checked={roomForm.settings?.voiceModulationEnabled || false}
                                onCheckedChange={(checked) => setRoomForm(prev => ({
                                  ...prev,
                                  settings: { ...prev.settings!, voiceModulationEnabled: checked }
                                }))}
                              />
                            </div>
                          </div>
                        </TabsContent>
                      </Tabs>
                      
                      <div className="flex justify-end space-x-2 pt-4 border-t">
                        <Button
                          variant="outline"
                          onClick={() => setIsCreateDialogOpen(false)}
                          disabled={isCreating}
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleCreateRoom}
                          disabled={isCreating || !roomForm.name?.trim()}
                        >
                          {isCreating ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Create Room
                            </>
                          )}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="rooms" className="flex items-center space-x-2">
            <Grid3X3 className="h-4 w-4" />
            <span>Rooms ({rooms.length})</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="rooms" className="space-y-4">
          {rooms.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto bg-muted rounded-lg flex items-center justify-center">
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">No Breakout Rooms</h3>
                  <p className="text-muted-foreground">
                    Create your first breakout room to start collaborative discussions
                  </p>
                </div>
                {(currentUser.isHost || currentUser.isModerator) && (
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Room
                  </Button>
                )}
              </div>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence>
                {rooms.map((room) => (
                  <RoomCard key={room.id} room={room} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Network className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold">{metrics.totalRooms}</p>
                    <p className="text-sm text-muted-foreground">Active Rooms</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">{metrics.totalParticipants}</p>
                    <p className="text-sm text-muted-foreground">Participants</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Activity className="h-5 w-5 text-purple-500" />
                  <div>
                    <p className="text-2xl font-bold">{metrics.eventThroughput}</p>
                    <p className="text-sm text-muted-foreground">Events/min</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Cpu className="h-5 w-5 text-orange-500" />
                  <div>
                    <p className="text-2xl font-bold">{metrics.averageLatency}ms</p>
                    <p className="text-sm text-muted-foreground">Avg Latency</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Real-time Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Advanced analytics dashboard coming soon...
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Auto-Assignment Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Assignment Strategy</label>
                <Select
                  value={advancedSettings.autoAssignStrategy}
                  onValueChange={(value) => setAdvancedSettings(prev => ({
                    ...prev,
                    autoAssignStrategy: value as any
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="balanced">Balanced Distribution</SelectItem>
                    <SelectItem value="random">Random Assignment</SelectItem>
                    <SelectItem value="skill-based">Skill-Based Matching</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">AI Moderation</p>
                  <p className="text-sm text-muted-foreground">Automatic content filtering</p>
                </div>
                <Switch
                  checked={advancedSettings.enableAIModeration}
                  onCheckedChange={(checked) => setAdvancedSettings(prev => ({
                    ...prev,
                    enableAIModeration: checked
                  }))}
                />
              </div>
              
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">Real-time Analytics</p>
                  <p className="text-sm text-muted-foreground">Live performance metrics</p>
                </div>
                <Switch
                  checked={advancedSettings.realtimeAnalytics}
                  onCheckedChange={(checked) => setAdvancedSettings(prev => ({
                    ...prev,
                    realtimeAnalytics: checked
                  }))}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};