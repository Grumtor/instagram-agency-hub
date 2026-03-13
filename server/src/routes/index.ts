import { Router } from 'express';
import authRoutes from './auth.routes';
import workspaceRoutes from './workspace.routes';
import instagramRoutes from './instagram.routes';
import instagramAccountRoutes from './instagramAccount.routes';
import postRoutes from './post.routes';
import calendarRoutes from './calendar.routes';
import dashboardRoutes from './dashboard.routes';
import auditLogRoutes from './auditLog.routes';
import messageRoutes from './message.routes';
import templateRoutes from './template.routes';
import { accountInsightRouter, postInsightRouter } from './insights.routes';
import notificationRoutes from './notification.routes';
import notificationPreferenceRoutes from './notificationPreference.routes';
import bulkRoutes from './bulk.routes';
import { reportRouter, sharedReportRouter } from './report.routes';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use('/auth', authRoutes);
router.use('/workspaces', workspaceRoutes);
router.use('/instagram', instagramRoutes);
router.use('/workspaces/:workspaceId/accounts', requireAuth, instagramAccountRoutes);
router.use('/workspaces/:workspaceId/posts/bulk', bulkRoutes);
router.use('/workspaces/:workspaceId/posts', postRoutes);
router.use('/workspaces/:workspaceId/posts', calendarRoutes);
router.use('/workspaces/:workspaceId/dashboard', dashboardRoutes);
router.use('/workspaces/:workspaceId/audit-log', auditLogRoutes);
router.use('/workspaces/:workspaceId/messages', messageRoutes);
router.use('/workspaces/:workspaceId', templateRoutes);
router.use('/workspaces/:workspaceId/accounts/:accountId', accountInsightRouter);
router.use('/workspaces/:workspaceId/posts/:postId', postInsightRouter);
router.use('/workspaces/:workspaceId/notifications', notificationRoutes);
router.use('/workspaces/:workspaceId/notification-preferences', notificationPreferenceRoutes);
router.use('/workspaces/:workspaceId/reports', reportRouter);
router.use('/reports/shared', sharedReportRouter);
// Note: webhook routes are mounted in app.ts before global JSON parser for raw body capture

export default router;
