import { useEffect, useCallback, useRef } from 'react';
import { getSocket, connectSocket } from '../services/socket';
import { useAuthStore } from '../store/useAuthStore';
import { useRoomStore } from '../store/useRoomStore';
import { Participant, RoomSettings, MovieInfo } from '../types';

let pendingRoomCode: string | null = null;

export function setPendingRoomJoin(roomCode: string) {
  pendingRoomCode = roomCode;
}

export function useSocket() {
  const token = useAuthStore((s) => s.token);
  const { addParticipant, removeParticipant, updateParticipant, setMovieInfo, setConnected, addTypingUser, removeTypingUser } = useRoomStore();
  const connectedRef = useRef(false);

  useEffect(() => {
    if (token && !connectedRef.current) {
      connectSocket(token);
      connectedRef.current = true;
      setConnected(true);
    }

    const socket = getSocket();
    if (!socket) return;

    const onConnect = () => {
      setConnected(true);
      if (pendingRoomCode) {
        socket.emit('room:join', { roomCode: pendingRoomCode });
        pendingRoomCode = null;
      }
    };
    const onDisconnect = () => setConnected(false);

    const onParticipantJoined = (participant: Participant) => {
      addParticipant(participant);
    };

    const onParticipantLeft = (data: { userId: string }) => {
      removeParticipant(data.userId);
    };

    const onParticipantReady = (data: { userId: string; isReady: boolean }) => {
      updateParticipant(data.userId, { isReady: data.isReady });
    };

    const onSettingsUpdated = (settings: RoomSettings) => {
      const room = useRoomStore.getState().currentRoom;
      if (room) {
        useRoomStore.getState().setRoom({ ...room, settings });
      }
    };

    const onMovieInfo = (info: MovieInfo) => {
      setMovieInfo(info);
    };

    const onHostChanged = (data: { hostId: string }) => {
      const room = useRoomStore.getState().currentRoom;
      if (room) {
        useRoomStore.getState().setRoom({ ...room, hostId: data.hostId });
      }
    };

    const onTyping = (data: { userId: string; nickname: string }) => {
      addTypingUser(data);
    };

    const onStopTyping = (data: { userId: string }) => {
      removeTypingUser(data.userId);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('room:participant-joined', onParticipantJoined);
    socket.on('room:participant-left', onParticipantLeft);
    socket.on('room:participant-ready', onParticipantReady);
    socket.on('room:settings-updated', onSettingsUpdated);
    socket.on('room:movie-info', onMovieInfo);
    socket.on('room:host-changed', onHostChanged);
    socket.on('chat:user-typing', onTyping);
    socket.on('chat:user-stop-typing', onStopTyping);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('room:participant-joined', onParticipantJoined);
      socket.off('room:participant-left', onParticipantLeft);
      socket.off('room:participant-ready', onParticipantReady);
      socket.off('room:settings-updated', onSettingsUpdated);
      socket.off('room:movie-info', onMovieInfo);
      socket.off('room:host-changed', onHostChanged);
      socket.off('chat:user-typing', onTyping);
      socket.off('chat:user-stop-typing', onStopTyping);
    };
  }, [token]);

  const emit = useCallback((event: string, data?: unknown) => {
    const socket = getSocket();
    if (socket?.connected) {
      socket.emit(event, data);
    } else if (event === 'room:join' && data && typeof data === 'object' && 'roomCode' in (data as any)) {
      pendingRoomCode = (data as any).roomCode;
    }
  }, []);

  return { emit, socket: getSocket() };
}
