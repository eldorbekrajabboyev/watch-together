import { Server as SocketServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import prisma from '../config/database';
import { registerRoomHandlers } from './roomHandlers';
import { registerSyncHandlers } from './syncHandlers';
import { registerVoiceHandlers } from './voiceHandlers';
import { registerChatHandlers } from './chatHandlers';

export const onlineUsers = new Map<string, Set<string>>();

export function setupSocketIO(io: SocketServer) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token || typeof token !== 'string') {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string };
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, nickname: true, avatar: true, isAdmin: true },
      });

      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      (socket as any).userId = user.id;
      (socket as any).user = user;
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId as string;
    const user = (socket as any).user;

    console.log(`[Socket] User connected: ${user.nickname} (${socket.id})`);

    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId)!.add(socket.id);

    socket.join(`user:${userId}`);

    io.emit('user:online', { userId, nickname: user.nickname });

    registerRoomHandlers(io, socket, onlineUsers);
    registerSyncHandlers(io, socket);
    registerVoiceHandlers(io, socket);
    registerChatHandlers(io, socket);

    socket.on('disconnect', (reason) => {
      console.log(`[Socket] User disconnected: ${user.nickname} (${socket.id}) reason=${reason}`);

      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          io.emit('user:offline', { userId });
        }
      }
    });
  });
}
