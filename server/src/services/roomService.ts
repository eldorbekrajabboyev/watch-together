import { customAlphabet } from 'nanoid';
import bcrypt from 'bcryptjs';
import prisma from '../config/database';

const generateCode = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 6);

export const roomService = {
  async createRoom(hostId: string, title: string, password?: string) {
    const code = generateCode();
    const data: any = {
      code,
      title,
      hostId,
      isActive: true,
      settings: { create: {} },
    };
    if (password) {
      data.password = await bcrypt.hash(password, 12);
      data.isPasswordProtected = true;
      data.settings.create.isPasswordProtected = true;
    }
    return prisma.room.create({
      data,
      include: { settings: true },
    });
  },

  async getRoomByCode(code: string) {
    return prisma.room.findUnique({
      where: { code },
      include: {
        settings: true,
        participants: { include: { user: true } },
      },
    });
  },

  async getRoomById(id: string) {
    return prisma.room.findUnique({
      where: { id },
      include: { settings: true },
    });
  },

  async joinRoom(code: string, userId: string, password?: string) {
    const room = await prisma.room.findUnique({
      where: { code },
      include: { participants: true, settings: true },
    });
    if (!room) throw new Error('Room not found');
    if (!room.isActive) throw new Error('Room is no longer active');

    if (room.isPasswordProtected) {
      if (!password) throw new Error('Password required');
      const valid = await bcrypt.compare(password, room.password!);
      if (!valid) throw new Error('Invalid password');
    }

    if (room.participants.length >= room.maxParticipants) {
      throw new Error('Room is full');
    }

    const existing = room.participants.find((p: { userId: string; id: string }) => p.userId === userId);
    if (existing) {
      return prisma.participant.update({
        where: { id: existing.id },
        data: { isConnected: true },
        include: { user: true },
      });
    }

    return prisma.participant.create({
      data: { userId, roomId: room.id },
      include: { user: true },
    });
  },

  async leaveRoom(roomId: string, userId: string) {
    const participant = await prisma.participant.findUnique({
      where: { userId_roomId: { userId, roomId } },
    });
    if (!participant) return null;

    await prisma.participant.delete({ where: { id: participant.id } });

    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) return null;

    if (room.hostId === userId && room.isActive) {
      const remaining = await prisma.participant.findFirst({
        where: { roomId },
        orderBy: { joinedAt: 'asc' },
      });
      if (remaining) {
        await prisma.room.update({
          where: { id: roomId },
          data: { hostId: remaining.userId },
        });
      } else {
        await prisma.room.update({
          where: { id: roomId },
          data: { isActive: false },
        });
      }
    }

    return participant;
  },

  async closeRoom(roomId: string) {
    return prisma.room.update({
      where: { id: roomId },
      data: { isActive: false },
    });
  },

  async updateRoomSettings(
    roomId: string,
    settings: {
      hostOnlyControl?: boolean;
      voiceEnabled?: boolean;
      chatEnabled?: boolean;
      autoSync?: boolean;
      isPasswordProtected?: boolean;
    }
  ) {
    return prisma.roomSettings.update({
      where: { roomId },
      data: settings,
    });
  },

  async isRoomHost(roomId: string, userId: string) {
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    return room?.hostId === userId;
  },

  async getActiveRooms() {
    return prisma.room.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { participants: true } },
        host: { select: { id: true, nickname: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  },
};
