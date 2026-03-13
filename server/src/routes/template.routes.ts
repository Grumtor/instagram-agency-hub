import { Router } from 'express';
import * as templateController from '../controllers/template.controller';
import { requireAuth } from '../middleware/auth';
import { requireWorkspaceAccess } from '../middleware/workspaceAccess';
import { validate } from '../middleware/validate';
import {
  createTemplateSchema,
  updateTemplateSchema,
  createHashtagSetSchema,
} from '../validators/template.validator';

const router = Router({ mergeParams: true });

router.use(requireAuth);
router.use(requireWorkspaceAccess());

// Templates
router.get('/templates', templateController.getTemplates);
router.post('/templates', validate(createTemplateSchema), templateController.createTemplate);
router.patch('/templates/:templateId', validate(updateTemplateSchema), templateController.updateTemplate);
router.delete('/templates/:templateId', templateController.deleteTemplate);
router.post('/templates/:templateId/use', templateController.useTemplate);

// Hashtag Sets
router.get('/hashtag-sets', templateController.getHashtagSets);
router.post('/hashtag-sets', validate(createHashtagSetSchema), templateController.createHashtagSet);
router.delete('/hashtag-sets/:setId', templateController.deleteHashtagSet);

export default router;
