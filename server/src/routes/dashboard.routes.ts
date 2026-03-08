import { Router } from 'express';
import * as dashboardController from '../controllers/dashboard.controller';
import { requireAuth } from '../middleware/auth';
import { requireWorkspaceAccess } from '../middleware/workspaceAccess';

const router = Router({ mergeParams: true });

router.use(requireAuth);
router.use(requireWorkspaceAccess());

router.get('/stats', dashboardController.getStats);

export default router;
