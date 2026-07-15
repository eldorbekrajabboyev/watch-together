import prisma from '../config/database';

export const chatService = {
  async sendMessage(
    roomId: string,
    userId: string,
    content: string,
    type: string = 'text',
    replyToId?: string
  ) {
    return prisma.message.create({
      data: {
        content,
        type,
        userId,
        roomId,
        replyToId: replyToId || null,
      },
      include: {
        user: { select: { id: true, nickname: true, avatar: true } },
      },
    });
  },

  async getMessages(roomId: string, limit: number = 50, cursor?: string) {
    const messages = await prisma.message.findMany({
      where: { roomId },
      take: limit,
      orderBy: { createdAt: 'desc' },
      ...(cursor && {
        skip: 1,
        cursor: { id: cursor },
      }),
      include: {
        user: { select: { id: true, nickname: true, avatar: true } },
      },
    });

    return {
      messages: messages.reverse(),
      nextCursor: messages.length === limit ? messages[0]?.id : undefined,
    };
  },

  async editMessage(messageId: string, userId: string, content: string) {
    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message) throw new Error('Message not found');
    if (message.userId !== userId) throw new Error('Not authorized');

    return prisma.message.update({
      where: { id: messageId },
      data: { content, isEdited: true },
      include: {
        user: { select: { id: true, nickname: true, avatar: true } },
      },
    });
  },

  async deleteMessage(messageId: string, userId: string) {
    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message) throw new Error('Message not found');
    if (message.userId !== userId) throw new Error('Not authorized');

    return prisma.message.update({
      where: { id: messageId },
      data: { isDeleted: true, content: 'This message has been deleted' },
    });
  },
};
