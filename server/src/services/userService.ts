import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { env } from '../config/env';

export const userService = {
  async createUser(nickname: string, email?: string, password?: string) {
    const data: any = { nickname };
    if (email) data.email = email;
    if (password) data.passwordHash = await bcrypt.hash(password, 12);
    return prisma.user.create({ data });
  },

  async getUserById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  },

  async getUserByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },

  async updateUser(id: string, data: { nickname?: string; avatar?: string; email?: string }) {
    return prisma.user.update({ where: { id }, data });
  },

  generateToken(userId: string): string {
    return jwt.sign({ userId }, env.JWT_SECRET, { expiresIn: '7d' });
  },

  verifyToken(token: string): { userId: string } {
    return jwt.verify(token, env.JWT_SECRET) as { userId: string };
  },
};
