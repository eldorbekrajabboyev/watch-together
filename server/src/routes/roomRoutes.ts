import { Router } from 'express';
import {
  createRoom,
  joinRoom,
  getRoom,
  getActiveRooms,
  updateRoomSettings,
  leaveRoom,
  closeRoom,
  getParticipants,
} from '../controllers/roomController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/active', getActiveRooms);
router.post('/', authenticate, createRoom);
router.post('/join', authenticate, joinRoom);
router.get('/history', authenticate, async (req: any, res: any) => {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  try {
    const userId = req.userId;
    const rooms = await prisma.room.findMany({
      where: { participants: { some: { userId } } },
      include: { host: true, _count: { select: { participants: true } } },
      orderBy: { updatedAt: 'desc' },
    });
    res.json({ rooms });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});
router.get('/:code', getRoom);
router.put('/:code/settings', authenticate, updateRoomSettings);
router.post('/:code/leave', authenticate, leaveRoom);
router.delete('/:code', authenticate, closeRoom);
router.get('/:code/participants', getParticipants);

export default router;
