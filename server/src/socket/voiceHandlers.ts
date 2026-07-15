import { Server as SocketServer, Socket } from 'socket.io';
import prisma from '../config/database';

interface VoiceUser {
  userId: string;
  socketId: string;
  nickname: string;
  micOn: boolean;
  speakerOn: boolean;
  isSpeaking: boolean;
}

const voiceRooms = new Map<string, Map<string, VoiceUser>>();

async function getRoomId(roomCode?: string, roomId?: string): Promise<string | null> {
  if (roomId) return roomId;
  if (roomCode) {
    const room = await prisma.room.findUnique({ where: { code: roomCode }, select: { id: true } });
    return room?.id || null;
  }
  return null;
}

export function registerVoiceHandlers(io: SocketServer, socket: Socket) {
  const userId = (socket as any).userId as string;
  const user = (socket as any).user;

  socket.on('voice:join', async (data: { roomCode?: string; roomId?: string; micOn?: boolean; speakerOn?: boolean }) => {
    try {
      const roomId = await getRoomId(data.roomCode, data.roomId);
      if (!roomId) return;

      socket.join(`voice:${roomId}`);

      if (!voiceRooms.has(roomId)) {
        voiceRooms.set(roomId, new Map());
      }

      const roomUsers = voiceRooms.get(roomId)!;
      roomUsers.set(userId, {
        userId,
        socketId: socket.id,
        nickname: user.nickname,
        micOn: data.micOn ?? false,
        speakerOn: data.speakerOn ?? true,
        isSpeaking: false,
      });

      const existingUsers = Array.from(roomUsers.values()).filter((u) => u.userId !== userId);

      socket.emit('voice:users', {
        roomId,
        users: existingUsers,
      });

      io.to(`voice:${roomId}`).emit('voice:user-joined', {
        roomId,
        userId,
        nickname: user.nickname,
        micOn: data.micOn ?? false,
        speakerOn: data.speakerOn ?? true,
        isSpeaking: false,
      });
    } catch (error: any) {
      socket.emit('voice:error', { message: error.message || 'Failed to join voice' });
    }
  });

  socket.on('voice:leave', async (data: { roomCode?: string; roomId?: string }) => {
    try {
      const roomId = await getRoomId(data.roomCode, data.roomId);
      if (!roomId) return;

      socket.leave(`voice:${roomId}`);

      const roomUsers = voiceRooms.get(roomId);
      if (roomUsers) {
        roomUsers.delete(userId);
        if (roomUsers.size === 0) {
          voiceRooms.delete(roomId);
        }
      }

      io.to(`voice:${roomId}`).emit('voice:user-left', {
        roomId,
        userId,
      });
    } catch (error: any) {
      socket.emit('voice:error', { message: error.message || 'Failed to leave voice' });
    }
  });

  socket.on('voice:mic', async (data: { roomCode?: string; roomId?: string; micOn: boolean }) => {
    try {
      const roomId = await getRoomId(data.roomCode, data.roomId);
      if (!roomId) return;

      const { micOn } = data;
      const roomUsers = voiceRooms.get(roomId);
      if (roomUsers && roomUsers.has(userId)) {
        roomUsers.get(userId)!.micOn = micOn;
      }

      io.to(`voice:${roomId}`).emit('voice:mic-changed', {
        roomId,
        userId,
        micOn,
      });
    } catch (error: any) {
      socket.emit('voice:error', { message: error.message || 'Failed to toggle mic' });
    }
  });

  socket.on('voice:speaker', async (data: { roomCode?: string; roomId?: string; speakerOn: boolean }) => {
    try {
      const roomId = await getRoomId(data.roomCode, data.roomId);
      if (!roomId) return;

      const { speakerOn } = data;
      const roomUsers = voiceRooms.get(roomId);
      if (roomUsers && roomUsers.has(userId)) {
        roomUsers.get(userId)!.speakerOn = speakerOn;
      }

      io.to(`voice:${roomId}`).emit('voice:speaker-changed', {
        roomId,
        userId,
        speakerOn,
      });
    } catch (error: any) {
      socket.emit('voice:error', { message: error.message || 'Failed to toggle speaker' });
    }
  });

  socket.on('voice:speaking', async (data: { roomCode?: string; roomId?: string; isSpeaking: boolean }) => {
    try {
      const roomId = await getRoomId(data.roomCode, data.roomId);
      if (!roomId) return;

      const { isSpeaking } = data;
      const roomUsers = voiceRooms.get(roomId);
      if (roomUsers && roomUsers.has(userId)) {
        roomUsers.get(userId)!.isSpeaking = isSpeaking;
      }

      socket.to(`voice:${roomId}`).emit('voice:speaking-changed', {
        roomId,
        userId,
        isSpeaking,
      });
    } catch (error: any) {
      socket.emit('voice:error', { message: error.message || 'Failed to update speaking state' });
    }
  });

  socket.on('voice:offer', async (data: { roomCode?: string; roomId?: string; targetUserId: string; offer: any }) => {
    try {
      const roomId = await getRoomId(data.roomCode, data.roomId);
      if (!roomId) return;

      const { targetUserId, offer } = data;
      const roomUsers = voiceRooms.get(roomId);
      if (!roomUsers) return;

      const targetUser = roomUsers.get(targetUserId);
      if (!targetUser) {
        return socket.emit('voice:error', { message: 'Target user not in voice channel' });
      }

      io.to(targetUser.socketId).emit('voice:offer', {
        roomId,
        fromUserId: userId,
        fromNickname: user.nickname,
        offer,
      });
    } catch (error: any) {
      socket.emit('voice:error', { message: error.message || 'Failed to send offer' });
    }
  });

  socket.on('voice:answer', async (data: { roomCode?: string; roomId?: string; targetUserId: string; answer: any }) => {
    try {
      const roomId = await getRoomId(data.roomCode, data.roomId);
      if (!roomId) return;

      const { targetUserId, answer } = data;
      const roomUsers = voiceRooms.get(roomId);
      if (!roomUsers) return;

      const targetUser = roomUsers.get(targetUserId);
      if (!targetUser) {
        return socket.emit('voice:error', { message: 'Target user not in voice channel' });
      }

      io.to(targetUser.socketId).emit('voice:answer', {
        roomId,
        fromUserId: userId,
        answer,
      });
    } catch (error: any) {
      socket.emit('voice:error', { message: error.message || 'Failed to send answer' });
    }
  });

  socket.on('voice:ice-candidate', async (data: {
    roomCode?: string;
    roomId?: string;
    targetUserId: string;
    candidate: any;
  }) => {
    try {
      const roomId = await getRoomId(data.roomCode, data.roomId);
      if (!roomId) return;

      const { targetUserId, candidate } = data;
      const roomUsers = voiceRooms.get(roomId);
      if (!roomUsers) return;

      const targetUser = roomUsers.get(targetUserId);
      if (!targetUser) {
        return socket.emit('voice:error', { message: 'Target user not in voice channel' });
      }

      io.to(targetUser.socketId).emit('voice:ice-candidate', {
        roomId,
        fromUserId: userId,
        candidate,
      });
    } catch (error: any) {
      socket.emit('voice:error', { message: error.message || 'Failed to send ICE candidate' });
    }
  });

  socket.on('disconnect', () => {
    voiceRooms.forEach((roomUsers, roomId) => {
      if (roomUsers.has(userId)) {
        roomUsers.delete(userId);
        if (roomUsers.size === 0) {
          voiceRooms.delete(roomId);
        } else {
          io.to(`voice:${roomId}`).emit('voice:user-left', {
            roomId,
            userId,
          });
        }
      }
    });
  });
}
