import { Router } from 'express';
import { getStats, getAllRooms, getAllUsers, getLogs } from '../controllers/adminController';
import { authenticate } from '../middleware/auth';
import { adminOnly } from '../middleware/admin';

const router = Router();

router.use(authenticate);
router.use(adminOnly);

router.get('/stats', getStats);
router.get('/rooms', getAllRooms);
router.get('/users', getAllUsers);
router.get('/logs', getLogs);

export default router;
