import { Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/database';

const createRoomSchema = z.object({
  title: z.string().min(1).max(100),
  password: z.string().min(1).max(50).optional(),
});

const joinRoomSchema = z.object({
  code: z.string().length(6),
  password: z.string().optional(),
});

const updateSettingsSchema = z.object({
  hostOnlyControl: z.boolean().optional(),
  voiceEnabled: z.boolean().optional(),
  chatEnabled: z.boolean().optional(),
  autoSync: z.boolean().optional(),
});

function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function getUniqueRoomCode(): Promise<string> {
  let code = generateRoomCode();
  let exists = await prisma.room.findUnique({ where: { code } });
  while (exists) {
    code = generateRoomCode();
    exists = await prisma.room.findUnique({ where: { code } });
  }
  return code;
}

export async function createRoom(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).userId;
    const body = createRoomSchema.parse(req.body);

    let hashedPassword: string | null = null;
    if (body.password) {
      hashedPassword = await bcrypt.hash(body.password, 10);
    }

    const code = await getUniqueRoomCode();

    const room = await prisma.room.create({
      data: {
        code,
        title: body.title,
        password: hashedPassword,
        isPasswordProtected: !!body.password,
        host: { connect: { id: userId } },
      },
    });

    await prisma.roomSettings.create({
      data: { roomId: room.id },
    });

    await prisma.participant.create({
      data: { roomId: room.id, userId, role: 'host' },
    });

    const fullRoom = await prisma.room.findUnique({
      where: { id: room.id },
      include: {
        host: {
          select: {
            id: true, nickname: true, avatar: true, email: true,
            isAdmin: true, createdAt: true, updatedAt: true,
          },
        },
        settings: true,
        participants: {
          include: {
            user: {
              select: {
                id: true, nickname: true, avatar: true, email: true,
                isAdmin: true, createdAt: true, updatedAt: true,
              },
            },
          },
        },
        _count: { select: { participants: true } },
      },
    });

    res.status(201).json({ room: fullRoom });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Validation failed', details: error.errors });
      return;
    }
    console.error('Create room error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function joinRoom(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).userId;
    const body = joinRoomSchema.parse(req.body);

    const room = await prisma.room.findUnique({
      where: { code: body.code },
    });

    if (!room) {
      res.status(404).json({ message: 'Room not found' });
      return;
    }

    if (!room.isActive) {
      res.status(400).json({ message: 'Room is no longer active' });
      return;
    }

    if (room.password) {
      if (!body.password) {
        res.status(400).json({ message: 'Room requires a password' });
        return;
      }
      const isValid = await bcrypt.compare(body.password, room.password);
      if (!isValid) {
        res.status(401).json({ message: 'Invalid password' });
        return;
      }
    }

    const participantCount = await prisma.participant.count({
      where: { roomId: room.id },
    });

    if (participantCount >= room.maxParticipants) {
      res.status(400).json({ message: 'Room is full' });
      return;
    }

    const existingParticipant = await prisma.participant.findFirst({
      where: { roomId: room.id, userId },
    });

    if (!existingParticipant) {
      await prisma.participant.create({
        data: { roomId: room.id, userId },
      });
    }

    const updatedRoom = await prisma.room.findUnique({
      where: { id: room.id },
      include: {
        host: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
            email: true,
            isAdmin: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        settings: true,
        participants: {
          include: {
            user: {
              select: {
                id: true,
                nickname: true,
                avatar: true,
                email: true,
                isAdmin: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        },
        _count: {
          select: {
            participants: true,
          },
        },
      },
    });

    res.json({ room: updatedRoom });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Validation failed', details: error.errors });
      return;
    }
    console.error('Join room error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function getRoom(req: Request, res: Response): Promise<void> {
  try {
    const { code } = req.params as { code: string };

    const room = await prisma.room.findUnique({
      where: { code },
      include: {
        host: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
            email: true,
            isAdmin: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        settings: true,
        participants: {
          include: {
            user: {
              select: {
                id: true,
                nickname: true,
                avatar: true,
                email: true,
                isAdmin: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        },
        _count: {
          select: {
            participants: true,
          },
        },
      },
    });

    if (!room) {
      res.status(404).json({ message: 'Room not found' });
      return;
    }

    res.json({ room });
  } catch (error) {
    console.error('Get room error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function getActiveRooms(req: Request, res: Response): Promise<void> {
  try {
    const rooms = await prisma.room.findMany({
      where: { isActive: true },
      include: {
        host: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
          },
        },
        _count: {
          select: {
            participants: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ rooms });
  } catch (error) {
    console.error('Get active rooms error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function updateRoomSettings(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).userId;
    const { code } = req.params as { code: string };
    const body = updateSettingsSchema.parse(req.body);

    const room = await prisma.room.findUnique({ where: { code } });

    if (!room) {
      res.status(404).json({ message: 'Room not found' });
      return;
    }

    if (room.hostId !== userId) {
      res.status(403).json({ message: 'Only the host can update room settings' });
      return;
    }

    const settings = await prisma.roomSettings.upsert({
      where: { roomId: room.id },
      update: body,
      create: { roomId: room.id, ...body },
    });

    res.json({ settings });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Validation failed', details: error.errors });
      return;
    }
    console.error('Update room settings error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function leaveRoom(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).userId;
    const { code } = req.params as { code: string };

    const room = await prisma.room.findUnique({ where: { code } });

    if (!room) {
      res.status(404).json({ message: 'Room not found' });
      return;
    }

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
      }
    }

    res.json({ message: 'Left room successfully' });
  } catch (error) {
    console.error('Leave room error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function closeRoom(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).userId;
    const { code } = req.params as { code: string };

    const room = await prisma.room.findUnique({ where: { code } });

    if (!room) {
      res.status(404).json({ message: 'Room not found' });
      return;
    }

    if (room.hostId !== userId) {
      res.status(403).json({ message: 'Only the host can close the room' });
      return;
    }

    await prisma.room.update({
      where: { id: room.id },
      data: { isActive: false },
    });

    await prisma.participant.deleteMany({
      where: { roomId: room.id },
    });

    res.json({ message: 'Room closed successfully' });
  } catch (error) {
    console.error('Close room error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function getParticipants(req: Request, res: Response): Promise<void> {
  try {
    const { code } = req.params as { code: string };

    const room = await prisma.room.findUnique({ where: { code } });

    if (!room) {
      res.status(404).json({ message: 'Room not found' });
      return;
    }

    const participants = await prisma.participant.findMany({
      where: { roomId: room.id },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
            email: true,
            isAdmin: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });

    res.json({ participants });
  } catch (error) {
    console.error('Get participants error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
