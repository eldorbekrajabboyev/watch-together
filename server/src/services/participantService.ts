import prisma from '../config/database';

export const participantService = {
  async setReady(roomId: string, userId: string, isReady: boolean) {
    return prisma.participant.update({
      where: { userId_roomId: { userId, roomId } },
      data: { isReady },
    });
  },

  async setMuted(roomId: string, userId: string, isMuted: boolean) {
    return prisma.participant.update({
      where: { userId_roomId: { userId, roomId } },
      data: { isMuted },
    });
  },

  async setSpeaking(roomId: string, userId: string, isSpeaking: boolean) {
    return prisma.participant.update({
      where: { userId_roomId: { userId, roomId } },
      data: { isSpeaking },
    });
  },

  async setConnected(roomId: string, userId: string, isConnected: boolean) {
    return prisma.participant.update({
      where: { userId_roomId: { userId, roomId } },
      data: { isConnected },
    });
  },

  async getParticipants(roomId: string) {
    return prisma.participant.findMany({
      where: { roomId },
      include: {
        user: { select: { id: true, nickname: true, avatar: true, email: true } },
      },
      orderBy: { joinedAt: 'asc' },
    });
  },
};
