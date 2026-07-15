import { create } from 'zustand';
import { Room, Participant, MovieInfo, SyncState, VoiceUser, TypingUser, Reaction } from '../types';

interface RoomState {
  currentRoom: Room | null;
  participants: Participant[];
  movieInfo: MovieInfo | null;
  syncState: SyncState;
  voiceUsers: VoiceUser[];
  typingUsers: TypingUser[];
  reactions: Reaction[];
  isConnected: boolean;

  setRoom: (room: Room | null) => void;
  setParticipants: (participants: Participant[]) => void;
  addParticipant: (participant: Participant) => void;
  removeParticipant: (userId: string) => void;
  updateParticipant: (userId: string, updates: Partial<Participant>) => void;
  setMovieInfo: (info: MovieInfo | null) => void;
  setSyncState: (state: Partial<SyncState>) => void;
  setVoiceUsers: (users: VoiceUser[]) => void;
  addVoiceUser: (user: VoiceUser) => void;
  removeVoiceUser: (userId: string) => void;
  setTypingUsers: (users: TypingUser[]) => void;
  addTypingUser: (user: TypingUser) => void;
  removeTypingUser: (userId: string) => void;
  addReaction: (reaction: Reaction) => void;
  removeReaction: (id: string) => void;
  setConnected: (connected: boolean) => void;
  resetRoom: () => void;
}

const defaultSyncState: SyncState = {
  isPlaying: false,
  currentTime: 0,
  playbackRate: 1,
  volume: 1,
  isMuted: false,
  isFullscreen: false,
  subtitleTrack: null,
  audioTrack: null,
  pausedBy: null,
};

export const useRoomStore = create<RoomState>()((set) => ({
  currentRoom: null,
  participants: [],
  movieInfo: null,
  syncState: defaultSyncState,
  voiceUsers: [],
  typingUsers: [],
  reactions: [],
  isConnected: false,

  setRoom: (room) => set({ currentRoom: room }),
  setParticipants: (participants) => set({ participants }),
  addParticipant: (participant) => set((state) => ({
    participants: [...state.participants.filter(p => p.userId !== participant.userId), participant],
  })),
  removeParticipant: (userId) => set((state) => ({
    participants: state.participants.filter(p => p.userId !== userId),
  })),
  updateParticipant: (userId, updates) => set((state) => ({
    participants: state.participants.map(p => p.userId === userId ? { ...p, ...updates } : p),
  })),
  setMovieInfo: (info) => set({ movieInfo: info }),
  setSyncState: (syncUpdate) => set((state) => ({
    syncState: { ...state.syncState, ...syncUpdate },
  })),
  setVoiceUsers: (users) => set({ voiceUsers: users }),
  addVoiceUser: (user) => set((state) => ({
    voiceUsers: [...state.voiceUsers.filter(u => u.userId !== user.userId), user],
  })),
  removeVoiceUser: (userId) => set((state) => ({
    voiceUsers: state.voiceUsers.filter(u => u.userId !== userId),
  })),
  setTypingUsers: (users) => set({ typingUsers: users }),
  addTypingUser: (user) => set((state) => ({
    typingUsers: [...state.typingUsers.filter(u => u.userId !== user.userId), user],
  })),
  removeTypingUser: (userId) => set((state) => ({
    typingUsers: state.typingUsers.filter(u => u.userId !== userId),
  })),
  addReaction: (reaction) => set((state) => ({
    reactions: [...state.reactions, reaction],
  })),
  removeReaction: (id) => set((state) => ({
    reactions: state.reactions.filter(r => r.id !== id),
  })),
  setConnected: (connected) => set({ isConnected: connected }),
  resetRoom: () => set({
    currentRoom: null,
    participants: [],
    movieInfo: null,
    syncState: defaultSyncState,
    voiceUsers: [],
    typingUsers: [],
    reactions: [],
  }),
}));