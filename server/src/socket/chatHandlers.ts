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

export function registerChatHandlers(io: SocketServer, socket: Socket) {
  const userId = (socket as any).userId as string;

  socket.on('chat:message', async (data: {
    roomId?: string;
    roomCode?: string;
    content: string;
    replyToId?: string;
  }) => {
    try {
      const { roomCode, content, replyToId } = data;
      const roomId = await getRoomId(roomCode, data.roomId);
      if (!roomId) return;

      if (!content || content.trim().length === 0) return;

      const message = await prisma.message.create({
        data: {
          roomId,
          userId,
          content: content.trim(),
          replyToId: replyToId || null,
        },
        include: {
          user: {
            select: { id: true, nickname: true, avatar: true, email: true, isAdmin: true, createdAt: true, updatedAt: true },
          },
        },
      });

      io.to(`room:${roomId}`).emit('chat:new-message', message);
    } catch (error: any) {
      console.error('Chat message error:', error);
      socket.emit('chat:error', { message: error.message || 'Failed to send message' });
    }
  });

  socket.on('chat:typing', (data: { roomId?: string; roomCode?: string }) => {
    getRoomId(data.roomCode, data.roomId).then((roomId) => {
      if (roomId) {
        socket.to(`room:${roomId}`).emit('chat:user-typing', {
          userId,
          nickname: (socket as any).user.nickname,
        });
      }
    });
  });

  socket.on('chat:stop-typing', (data: { roomId?: string; roomCode?: string }) => {
    getRoomId(data.roomCode, data.roomId).then((roomId) => {
      if (roomId) {
        socket.to(`room:${roomId}`).emit('chat:user-stop-typing', { userId });
      }
    });
  });

  socket.on('chat:edit', async (data: { roomId?: string; roomCode?: string; messageId: string; content: string }) => {
    try {
      const roomId = await getRoomId(data.roomCode, data.roomId);
      if (!roomId) return;
      if (!data.content || data.content.trim().length === 0) return;

      const existing = await prisma.message.findUnique({ where: { id: data.messageId } });
      if (!existing || existing.userId !== userId) return;

      const message = await prisma.message.update({
        where: { id: data.messageId },
        data: { content: data.content.trim(), isEdited: true },
        include: {
          user: { select: { id: true, nickname: true, avatar: true, email: true, isAdmin: true, createdAt: true, updatedAt: true } },
        },
      });

      io.to(`room:${roomId}`).emit('chat:message-edited', message);
    } catch {}
  });

  socket.on('chat:delete', async (data: { roomId?: string; roomCode?: string; messageId: string }) => {
    try {
      const roomId = await getRoomId(data.roomCode, data.roomId);
      if (!roomId) return;

      const existing = await prisma.message.findUnique({ where: { id: data.messageId } });
      if (!existing || existing.userId !== userId) return;

      await prisma.message.update({
        where: { id: data.messageId },
        data: { content: '[Deleted]', isDeleted: true, isEdited: false },
      });

      io.to(`room:${roomId}`).emit('chat:message-deleted', { messageId: data.messageId });
    } catch {}
  });

  socket.on('chat:reaction', (data: { roomId?: string; roomCode?: string; messageId: string; emoji: string }) => {
    getRoomId(data.roomCode, data.roomId).then((roomId) => {
      if (roomId) {
        io.to(`room:${roomId}`).emit('chat:reaction-added', {
          messageId: data.messageId,
          emoji: data.emoji,
          userId,
          nickname: (socket as any).user.nickname,
        });
      }
    });
  });
}
