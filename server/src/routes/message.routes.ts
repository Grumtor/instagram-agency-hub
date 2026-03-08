import { Router } from 'express';
import * as messageController from '../controllers/message.controller';
import { requireAuth } from '../middleware/auth';
import { requireWorkspaceAccess } from '../middleware/workspaceAccess';
import { validate } from '../middleware/validate';
import { sendMessageSchema } from '../validators/message.validator';

const router = Router({ mergeParams: true });

router.use(requireAuth);
router.use(requireWorkspaceAccess());

router.get('/conversations', messageController.getConversations);
router.get('/conversations/:conversationId', messageController.getMessages);
router.post('/send', validate(sendMessageSchema), messageController.sendMessage);

export default router;
