export interface User {
  id: string;
  nickname: string;
  avatar: string | null;
  email: string | null;
  isAdmin: boolean;
  createdAt: string;
}

export interface RoomSettings {
  id: string;
  roomId: string;
  hostOnlyControl: boolean;
  voiceEnabled: boolean;
  chatEnabled: boolean;
  autoSync: boolean;
  isPasswordProtected: boolean;
}

export interface Participant {
  id: string;
  userId: string;
  roomId: string;
  role: string;
  isReady: boolean;
  isMuted: boolean;
  isSpeaking: boolean;
  isConnected: boolean;
  joinedAt: string;
  user: User;
}

export interface Room {
  id: string;
  code: string;
  title: string;
  hostId: string;
  isPasswordProtected: boolean;
  maxParticipants: number;
  isActive: boolean;
  createdAt: string;
  settings: RoomSettings;
  participants: Participant[];
  host: User;
  _count?: { participants: number; messages: number };
}

export interface Message {
  id: string;
  content: string;
  type: string;
  replyToId: string | null;
  isEdited: boolean;
  isDeleted: boolean;
  userId: string;
  roomId: string;
  createdAt: string;
  updatedAt: string;
  user: User;
  replyTo?: Message | null;
}

export interface MovieInfo {
  filename: string;
  filesize: number;
  duration: number;
  hash: string;
}

export interface SyncState {
  isPlaying: boolean;
  currentTime: number;
  playbackRate: number;
  volume: number;
  isMuted: boolean;
  isFullscreen: boolean;
  subtitleTrack: string | null;
  audioTrack: string | null;
  pausedBy: string | null;
}

export interface VoiceUser {
  userId: string;
  nickname: string;
  micOn: boolean;
  speakerOn: boolean;
  isSpeaking: boolean;
}

export interface Reaction {
  id: string;
  emoji: string;
  userId: string;
  nickname: string;
  x: number;
  y: number;
  timestamp: number;
}

export interface AdminStats {
  totalUsers: number;
  activeRooms: number;
  totalMessages: number;
  onlineUsers: number;
}

export interface TypingUser {
  userId: string;
  nickname: string;
}
