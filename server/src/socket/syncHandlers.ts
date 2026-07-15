import { Server as SocketServer, Socket } from 'socket.io';
import prisma from '../config/database';

async function getRoomId(roomCode?: string, roomId?: string): Promise<string | null> {
  if (roomId) return roomId;
  if (roomCode) {
    const room = await prisma.room.findUnique({ where: { code: roomCode }, select: { id: true } });
    return room?.id || null;
  }
  return null;
}

export function registerSyncHandlers(io: SocketServer, socket: Socket) {
  const userId = (socket as any).userId as string;

  const events = [
    'sync:play',
    'sync:pause',
    'sync:seek',
    'sync:time-update',
    'sync:playback-rate',
    'sync:volume',
    'sync:fullscreen',
    'sync:subtitle-change',
    'sync:audio-track-change',
  ];

  events.forEach((event) => {
    socket.on(event, async (data: any) => {
      try {
        const roomId = await getRoomId(data.roomCode, data.roomId);
        if (!roomId) return;
        if (!socket.rooms.has(`room:${roomId}`)) return;

        const broadcastData = { ...data, userId };
        delete broadcastData.roomCode;
        delete broadcastData.roomId;

        socket.to(`room:${roomId}`).emit(event, broadcastData);
      } catch {}
    });
  });
}
