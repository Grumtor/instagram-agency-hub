import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireWorkspaceAccess } from '../middleware/workspaceAccess';
import * as insightsController from '../controllers/insights.controller';

// Router for account-level insight endpoints
// Mounted at /workspaces/:workspaceId/accounts/:accountId
export const accountInsightRouter = Router({ mergeParams: true });
accountInsightRouter.use(requireAuth);
accountInsightRouter.use(requireWorkspaceAccess());

accountInsightRouter.get('/insights', insightsController.getAccountInsights);
accountInsightRouter.post('/insights/refresh', insightsController.refreshAccountInsights);

// Router for post-level insight endpoints
// Mounted at /workspaces/:workspaceId/posts/:postId
export const postInsightRouter = Router({ mergeParams: true });
postInsightRouter.use(requireAuth);
postInsightRouter.use(requireWorkspaceAccess());

postInsightRouter.get('/insights', insightsController.getPostInsights);
postInsightRouter.post('/insights/refresh', insightsController.refreshPostInsights);
