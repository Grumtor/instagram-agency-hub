import { Request, Response, NextFunction } from 'express';
import * as notificationService from '../services/notification.service';
import { successResponse } from '../utils/apiResponse';
import { UnauthorizedError } from '../utils/errors';

export async function getNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const type = req.query.type as string | undefined;

    const result = await notificationService.getNotifications(
      req.user.id,
      req.params.workspaceId as string,
      { page, limit, type },
    );
    successResponse(res, result);
  } catch (error) {
    next(error);
  }
}

export async function getUnreadCount(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const count = await notificationService.getUnreadCount(
      req.user.id,
      req.params.workspaceId as string,
    );
    successResponse(res, { count });
  } catch (error) {
    next(error);
  }
}

export async function markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    await notificationService.markAsRead(req.params.id as string, req.user.id);
    successResponse(res, { success: true });
  } catch (error) {
    next(error);
  }
}

export async function markAllAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    await notificationService.markAllAsRead(req.user.id, req.params.workspaceId as string);
    successResponse(res, { success: true });
  } catch (error) {
    next(error);
  }
}

export async function getPreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const prefs = await notificationService.getPreferences(
      req.user.id,
      req.params.workspaceId as string,
    );
    successResponse(res, prefs);
  } catch (error) {
    next(error);
  }
}

export async function updatePreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const { tokenExpiring, engagementSpike } = req.body as {
      tokenExpiring?: boolean;
      engagementSpike?: boolean;
    };
    const prefs = await notificationService.updatePreferences(
      req.user.id,
      req.params.workspaceId as string,
      { tokenExpiring, engagementSpike },
    );
    successResponse(res, prefs);
  } catch (error) {
    next(error);
  }
}
