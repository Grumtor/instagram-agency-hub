import { Router } from 'express';
import * as workspaceController from '../controllers/workspace.controller';
import { requireAuth } from '../middleware/auth';
import { requireWorkspaceAccess } from '../middleware/workspaceAccess';
import { validate } from '../middleware/validate';
import { createWorkspaceSchema, updateWorkspaceSchema, addMemberSchema, updateMemberRoleSchema } from '../validators/workspace.validator';
import { MemberRole } from '../types/enums';

const router = Router();

router.use(requireAuth);

router.post('/', validate(createWorkspaceSchema), workspaceController.createWorkspace);
router.get('/', workspaceController.getWorkspaces);

router.get('/:workspaceId', requireWorkspaceAccess(), workspaceController.getWorkspaceById);
router.patch('/:workspaceId', requireWorkspaceAccess([MemberRole.OWNER, MemberRole.ADMIN]), validate(updateWorkspaceSchema), workspaceController.updateWorkspace);
router.delete('/:workspaceId', requireWorkspaceAccess([MemberRole.OWNER]), workspaceController.deleteWorkspace);

router.get('/:workspaceId/members', requireWorkspaceAccess(), workspaceController.getMembers);
router.post('/:workspaceId/members', requireWorkspaceAccess([MemberRole.OWNER, MemberRole.ADMIN]), validate(addMemberSchema), workspaceController.addMember);
router.patch('/:workspaceId/members/:memberId', requireWorkspaceAccess([MemberRole.OWNER, MemberRole.ADMIN]), validate(updateMemberRoleSchema), workspaceController.updateMemberRole);
router.delete('/:workspaceId/members/:memberId', requireWorkspaceAccess([MemberRole.OWNER, MemberRole.ADMIN]), workspaceController.removeMember);

export default router;
