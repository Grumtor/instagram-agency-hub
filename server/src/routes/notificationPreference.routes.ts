import { Router } from 'express';
import * as notificationController from '../controllers/notification.controller';
import { requireAuth } from '../middleware/auth';
import { requireWorkspaceAccess } from '../middleware/workspaceAccess';

const router = Router({ mergeParams: true });

router.use(requireAuth);
router.use(requireWorkspaceAccess());

router.get('/', notificationController.getPreferences);
router.patch('/', notificationController.updatePreferences);

export default router;
