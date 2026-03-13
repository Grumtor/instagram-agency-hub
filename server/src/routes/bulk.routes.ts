import { Router } from 'express';
import * as bulkController from '../controllers/bulk.controller';
import { requireAuth } from '../middleware/auth';
import { requireWorkspaceAccess } from '../middleware/workspaceAccess';
import { validate } from '../middleware/validate';
import { handleUpload, handleCsvUpload } from '../middleware/upload';
import { bulkConfirmSchema } from '../validators/bulk.validator';

const router = Router({ mergeParams: true });

router.use(requireAuth);
router.use(requireWorkspaceAccess());

// GET /api/workspaces/:workspaceId/posts/bulk/template
router.get('/template', bulkController.getCsvTemplate);

// POST /api/workspaces/:workspaceId/posts/bulk/csv
router.post('/csv', handleCsvUpload('file'), bulkController.uploadCsv);

// POST /api/workspaces/:workspaceId/posts/bulk/media
router.post('/media', handleUpload('files', 100), bulkController.uploadMedia);

// POST /api/workspaces/:workspaceId/posts/bulk/confirm
router.post('/confirm', validate(bulkConfirmSchema), bulkController.confirmBulk);

export default router;
