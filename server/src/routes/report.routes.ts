import { Router } from 'express';
import * as reportController from '../controllers/report.controller';
import { requireAuth } from '../middleware/auth';
import { requireWorkspaceAccess } from '../middleware/workspaceAccess';
import { validate } from '../middleware/validate';
import { generateReportSchema } from '../validators/report.validator';

// ─── Workspace-scoped report router ───────────────────────────────────────────
// Mounted at /workspaces/:workspaceId/reports
export const reportRouter = Router({ mergeParams: true });
reportRouter.use(requireAuth);
reportRouter.use(requireWorkspaceAccess());

reportRouter.get('/', reportController.getReports);
reportRouter.post('/', validate(generateReportSchema), reportController.generateReport);
reportRouter.get('/:reportId', reportController.getReport);
reportRouter.post('/:reportId/share', reportController.shareReport);
reportRouter.get('/:reportId/export', reportController.exportReport);

// ─── Public shared report router ──────────────────────────────────────────────
// Mounted at /reports/shared/:shareToken — no auth required
export const sharedReportRouter = Router();
sharedReportRouter.get('/:shareToken', reportController.getSharedReport);

export default reportRouter;
