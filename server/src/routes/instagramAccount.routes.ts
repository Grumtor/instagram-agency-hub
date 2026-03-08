import { Router } from 'express';
import * as instagramAccountController from '../controllers/instagramAccount.controller';
import { requireWorkspaceAccess } from '../middleware/workspaceAccess';
import { MemberRole } from '../types/enums';

const router = Router({ mergeParams: true });

router.use(requireWorkspaceAccess());

router.get('/', instagramAccountController.getAccounts);
router.get('/:accountId', instagramAccountController.getAccountById);
router.delete(
  '/:accountId',
  requireWorkspaceAccess([MemberRole.OWNER, MemberRole.ADMIN]),
  instagramAccountController.disconnectAccount,
);
router.post(
  '/:accountId/refresh-token',
  requireWorkspaceAccess([MemberRole.OWNER, MemberRole.ADMIN]),
  instagramAccountController.refreshToken,
);

export default router;
