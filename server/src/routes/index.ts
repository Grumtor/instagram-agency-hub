import { Router } from 'express';
import authRoutes from './auth.routes';
import workspaceRoutes from './workspace.routes';
import instagramRoutes from './instagram.routes';
import instagramAccountRoutes from './instagramAccount.routes';
import postRoutes from './post.routes';
import dashboardRoutes from './dashboard.routes';
import auditLogRoutes from './auditLog.routes';
import messageRoutes from './message.routes';
import { accountInsightRouter, postInsightRouter } from './insights.routes';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use('/auth', authRoutes);
router.use('/workspaces', workspaceRoutes);
router.use('/instagram', instagramRoutes);
router.use('/workspaces/:workspaceId/accounts', requireAuth, instagramAccountRoutes);
router.use('/workspaces/:workspaceId/posts', postRoutes);
router.use('/workspaces/:workspaceId/dashboard', dashboardRoutes);
router.use('/workspaces/:workspaceId/audit-log', auditLogRoutes);
router.use('/workspaces/:workspaceId/messages', messageRoutes);
router.use('/workspaces/:workspaceId/accounts/:accountId', accountInsightRouter);
router.use('/workspaces/:workspaceId/posts/:postId', postInsightRouter);
// Note: webhook routes are mounted in app.ts before global JSON parser for raw body capture

export default router;
