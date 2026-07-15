import { Router } from 'express';
import { getMessages, editMessage, deleteMessage } from '../controllers/chatController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/:roomId/messages', authenticate, getMessages);
router.put('/:roomId/messages/:messageId', authenticate, editMessage);
router.delete('/:roomId/messages/:messageId', authenticate, deleteMessage);

export default router;
