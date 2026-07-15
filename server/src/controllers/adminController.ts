import { Request, Response } from 'express';
import { prisma } from '../config/database';

export async function getStats(req: Request, res: Response): Promise<void> {
  try {
    const totalUsers = await prisma.user.count();

    const activeRooms = await prisma.room.count({
      where: { isActive: true },
    });

    const totalMessages = await prisma.message.count();

    const onlineUsers = await prisma.participant.groupBy({
      by: ['userId'],
    });

    res.json({
      totalUsers,
      activeRooms,
      totalMessages,
      onlineUsers: onlineUsers.length,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function getAllRooms(req: Request, res: Response): Promise<void> {
  try {
    const rooms = await prisma.room.findMany({
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
            messages: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      rooms: rooms.map((room: any) => ({
        ...room,
        hasPassword: !!room.password,
        password: undefined,
      })),
    });
  } catch (error) {
    console.error('Get all rooms error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function getAllUsers(req: Request, res: Response): Promise<void> {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        nickname: true,
        email: true,
        avatar: true,
        isAdmin: true,
        createdAt: true,
        _count: {
          select: {
            messages: true,
            hostedRooms: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const usersWithActivity = await Promise.all(
      users.map(async (user: any) => {
        const lastMessage = await prisma.message.findFirst({
          where: { userId: user.id },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        });

        const lastRoom = await prisma.participant.findFirst({
          where: { userId: user.id },
          orderBy: { joinedAt: 'desc' },
          select: { joinedAt: true },
        });

        return {
          ...user,
          lastActivity: lastMessage?.createdAt || lastRoom?.joinedAt || user.createdAt,
        };
      })
    );

    res.json({
      users: usersWithActivity,
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function getLogs(req: Request, res: Response): Promise<void> {
  try {
    const recentMessages = await prisma.message.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
          },
        },
        room: {
          select: {
            id: true,
            code: true,
            title: true,
          },
        },
      },
    });

    const recentRooms = await prisma.room.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        code: true,
        title: true,
        createdAt: true,
        isActive: true,
        host: {
          select: {
            id: true,
            nickname: true,
          },
        },
      },
    });

    const recentJoins = await prisma.participant.findMany({
      take: 30,
      orderBy: { joinedAt: 'desc' },
      select: {
        id: true,
        joinedAt: true,
        user: {
          select: {
            id: true,
            nickname: true,
          },
        },
        room: {
          select: {
            id: true,
            code: true,
            title: true,
          },
        },
      },
    });

    const logs = [
      ...recentMessages.map((msg: any) => ({
        type: 'message' as const,
        timestamp: msg.createdAt,
        user: msg.user,
        room: msg.room,
        content: msg.content.substring(0, 100),
      })),
      ...recentRooms.map((room: any) => ({
        type: 'room_created' as const,
        timestamp: room.createdAt,
        user: room.host,
        room: { id: room.id, code: room.code, title: room.title },
        details: { isActive: room.isActive },
      })),
      ...recentJoins.map((join: any) => ({
        type: 'room_join' as const,
        timestamp: join.joinedAt,
        user: join.user,
        room: join.room,
      })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 50);

    res.json({
      logs,
    });
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
