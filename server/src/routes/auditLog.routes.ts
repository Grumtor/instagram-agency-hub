import { Router } from 'express';
import * as auditLogController from '../controllers/auditLog.controller';
import { requireAuth } from '../middleware/auth';
import { requireWorkspaceAccess } from '../middleware/workspaceAccess';
import { MemberRole } from '../types/enums';

const router = Router({ mergeParams: true });

router.use(requireAuth);
router.use(requireWorkspaceAccess([MemberRole.OWNER, MemberRole.ADMIN]));

router.get('/', auditLogController.getAuditLogs);

export default router;
