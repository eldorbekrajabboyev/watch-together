import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';

const getMessagesSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

const editMessageSchema = z.object({
  content: z.string().min(1).max(2000),
});

export async function getMessages(req: Request, res: Response): Promise<void> {
  try {
    const { roomId } = req.params as { roomId: string };
    const { limit, cursor } = getMessagesSchema.parse(req.query);

    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      res.status(404).json({ message: 'Room not found' });
      return;
    }

    const messages = await prisma.message.findMany({
      where: {
        roomId,
        ...(cursor
          ? { createdAt: { lt: new Date(Buffer.from(cursor, 'base64').toString('ascii')) } }
          : {}),
      },
      include: {
        user: {
          select: { id: true, nickname: true, avatar: true, email: true, isAdmin: true, createdAt: true, updatedAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });

    const hasMore = messages.length > limit;
    const slicedMessages = hasMore ? messages.slice(0, limit) : messages;
    const nextCursor = hasMore
      ? Buffer.from(slicedMessages[slicedMessages.length - 1].createdAt.toISOString()).toString('base64')
      : null;

    res.json({
      messages: slicedMessages.reverse(),
      nextCursor,
      hasMore,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Validation failed', details: error.errors });
      return;
    }
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function editMessage(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).userId;
    const { roomId, messageId } = req.params as { roomId: string; messageId: string };
    const body = editMessageSchema.parse(req.body);

    const message = await prisma.message.findUnique({ where: { id: messageId } });

    if (!message) {
      res.status(404).json({ message: 'Message not found' });
      return;
    }

    if (message.roomId !== roomId) {
      res.status(400).json({ message: 'Message does not belong to this room' });
      return;
    }

    if (message.userId !== userId) {
      res.status(403).json({ message: 'You can only edit your own messages' });
      return;
    }

    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: { content: body.content, isEdited: true },
      include: {
        user: {
          select: { id: true, nickname: true, avatar: true, email: true, isAdmin: true, createdAt: true, updatedAt: true },
        },
      },
    });

    res.json({ message: updatedMessage });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Validation failed', details: error.errors });
      return;
    }
    console.error('Edit message error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function deleteMessage(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).userId;
    const { roomId, messageId } = req.params as { roomId: string; messageId: string };

    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      res.status(404).json({ message: 'Message not found' });
      return;
    }

    if (message.roomId !== roomId) {
      res.status(400).json({ message: 'Message does not belong to this room' });
      return;
    }

    const room = await prisma.room.findUnique({ where: { id: roomId } });
    const isOwner = message.userId === userId;
    const isHost = room?.hostId === userId;

    if (!isOwner && !isHost) {
      res.status(403).json({ message: 'You can only delete your own messages' });
      return;
    }

    await prisma.message.delete({ where: { id: messageId } });

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
