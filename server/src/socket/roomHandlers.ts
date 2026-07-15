import { Server as SocketServer, Socket } from 'socket.io';
import prisma from '../config/database';

export function registerRoomHandlers(
  io: SocketServer,
  socket: Socket,
  _onlineUsers: Map<string, Set<string>>
) {
  const userId = (socket as any).userId as string;

  socket.on('room:join', async (data: { roomCode: string }) => {
    try {
      const { roomCode } = data;
      const room = await prisma.room.findUnique({ where: { code: roomCode } });
      if (!room) {
        socket.emit('room:error', { message: 'Room not found' });
        return;
      }

      socket.join(`room:${room.id}`);

      const participant = await prisma.participant.findFirst({
        where: { roomId: room.id, userId },
        include: { user: true },
      });

      if (!participant) {
        const newParticipant = await prisma.participant.create({
          data: { roomId: room.id, userId },
          include: { user: true },
        });
        io.to(`room:${room.id}`).emit('room:participant-joined', newParticipant);
      }
    } catch (error: any) {
      socket.emit('room:error', { message: error.message || 'Failed to join room' });
    }
  });

  socket.on('room:leave', async (data: { roomCode: string }) => {
    try {
      const { roomCode } = data;
      const room = await prisma.room.findUnique({ where: { code: roomCode } });
      if (!room) return;

      socket.leave(`room:${room.id}`);

      await prisma.participant.deleteMany({
        where: { roomId: room.id, userId },
      });

      if (room.hostId === userId) {
        const remaining = await prisma.participant.findFirst({
          where: { roomId: room.id, userId: { not: userId } },
          orderBy: { joinedAt: 'asc' },
        });

        if (remaining) {
          await prisma.room.update({
            where: { id: room.id },
            data: { hostId: remaining.userId },
          });
          await prisma.participant.update({
            where: { id: remaining.id },
            data: { role: 'host' },
          });
          io.to(`room:${room.id}`).emit('room:host-changed', { hostId: remaining.userId });
        }
      }

      io.to(`room:${room.id}`).emit('room:participant-left', { userId });
    } catch (error: any) {
      socket.emit('room:error', { message: error.message || 'Failed to leave room' });
    }
  });

  socket.on('room:ready', async (data: { roomCode: string }) => {
    try {
      const { roomCode } = data;
      const room = await prisma.room.findUnique({ where: { code: roomCode } });
      if (!room) return;

      const current = await prisma.participant.findFirst({
        where: { roomId: room.id, userId },
      });

      if (!current) return;

      const updated = await prisma.participant.update({
        where: { id: current.id },
        data: { isReady: !current.isReady },
        include: { user: true },
      });

      io.to(`room:${room.id}`).emit('room:participant-ready', {
        userId,
        isReady: updated.isReady,
      });
    } catch (error: any) {
      socket.emit('room:error', { message: error.message || 'Failed to toggle ready' });
    }
  });

  socket.on('room:start', async (data: { roomCode: string }) => {
    try {
      const { roomCode } = data;
      const room = await prisma.room.findUnique({ where: { code: roomCode } });
      if (!room) {
        socket.emit('room:error', { message: 'Room not found' });
        return;
      }
      const participant = await prisma.participant.findFirst({
        where: { roomId: room.id, userId },
      });
      if (!participant) {
        socket.emit('room:error', { message: 'You are not in this room' });
        return;
      }

      io.to(`room:${room.id}`).emit('room:started', {
        timestamp: Date.now(),
        startedBy: userId,
      });
    } catch (error: any) {
      socket.emit('room:error', { message: error.message || 'Failed to start' });
    }
  });

  socket.on('room:settings-update', async (data: { roomCode: string; settings: any }) => {
    try {
      const { roomCode, settings } = data;
      const room = await prisma.room.findUnique({ where: { code: roomCode } });
      if (!room || room.hostId !== userId) return;

      await prisma.roomSettings.upsert({
        where: { roomId: room.id },
        update: settings,
        create: { roomId: room.id, ...settings },
      });

      io.to(`room:${room.id}`).emit('room:settings-updated', settings);
    } catch (error: any) {
      socket.emit('room:error', { message: error.message });
    }
  });

  socket.on('room:movie-info', (data: {
    roomCode: string;
    filename: string;
    filesize: number;
    duration: number;
    hash: string;
  }) => {
    try {
      const { roomCode, ...info } = data;
      prisma.room.findUnique({ where: { code: roomCode } }).then((room) => {
        if (room) {
          io.to(`room:${room.id}`).emit('room:movie-info', info);
        }
      });
    } catch (error: any) {
      socket.emit('room:error', { message: error.message });
    }
  });
}
