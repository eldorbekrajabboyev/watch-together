import { Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { env } from '../config/env';

const registerSchema = z.object({
  nickname: z.string().min(2).max(30),
  email: z.string().email().optional(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().optional(),
  nickname: z.string().optional(),
  password: z.string().min(6),
});

const updateProfileSchema = z.object({
  nickname: z.string().min(2).max(30).optional(),
  avatar: z.string().url().optional(),
});

function generateToken(userId: string): string {
  return jwt.sign({ userId }, env.JWT_SECRET, {
    expiresIn: '7d',
  });
}

function sanitizeUser(user: any) {
  const { passwordHash, ...rest } = user;
  return rest;
}

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const body = registerSchema.parse(req.body);

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { nickname: body.nickname },
          ...(body.email ? [{ email: body.email }] : []),
        ],
      },
    });

    if (existingUser) {
      res.status(409).json({
        message: existingUser.nickname === body.nickname
          ? 'Nickname already taken'
          : 'Email already registered',
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(body.password, 12);

    const user = await prisma.user.create({
      data: {
        nickname: body.nickname,
        email: body.email,
        passwordHash: hashedPassword,
      },
    });

    const token = generateToken(user.id);

    res.status(201).json({
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        message: 'Validation failed',
        details: error.errors,
      });
      return;
    }
    console.error('Register error:', error);
    res.status(500).json({
      message: 'Internal server error',
    });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const body = loginSchema.parse(req.body);

    if (!body.email && !body.nickname) {
      res.status(400).json({
        message: 'Email or nickname is required',
      });
      return;
    }

    const user = await prisma.user.findFirst({
      where: body.email
        ? { email: body.email }
        : { nickname: body.nickname },
    });

    if (!user || !user.passwordHash) {
      res.status(401).json({
        message: 'Invalid email or password',
      });
      return;
    }

    const isValidPassword = await bcrypt.compare(body.password, user.passwordHash);

    if (!isValidPassword) {
      res.status(401).json({
        message: 'Invalid email or password',
      });
      return;
    }

    const token = generateToken(user.id);

    res.json({
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        message: 'Validation failed',
        details: error.errors,
      });
      return;
    }
    console.error('Login error:', error);
    res.status(500).json({
      message: 'Internal server error',
    });
  }
}

export async function getMe(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404).json({
        message: 'User not found',
      });
      return;
    }

    res.json({
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      message: 'Internal server error',
    });
  }
}

export async function updateMe(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).userId;
    const body = updateProfileSchema.parse(req.body);

    if (Object.keys(body).length === 0) {
      res.status(400).json({
        message: 'No fields to update',
      });
      return;
    }

    if (body.nickname) {
      const existingUser = await prisma.user.findFirst({
        where: {
          nickname: body.nickname,
          id: { not: userId },
        },
      });

      if (existingUser) {
        res.status(409).json({
          message: 'Nickname already taken',
        });
        return;
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: body,
    });

    res.json({
      user: sanitizeUser(user),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        message: 'Validation failed',
        details: error.errors,
      });
      return;
    }
    console.error('Update me error:', error);
    res.status(500).json({
      message: 'Internal server error',
    });
  }
}
