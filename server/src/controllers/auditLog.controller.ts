import { Request, Response, NextFunction } from 'express';
import * as auditLogService from '../services/auditLog.service';
import { successResponse } from '../utils/apiResponse';

export async function getAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const action = req.query.action as string | undefined;
    const entityType = req.query.entityType as string | undefined;
    const userId = req.query.userId as string | undefined;

    const result = await auditLogService.getAuditLogs(
      req.params.workspaceId as string,
      { action, entityType, userId },
      { page, limit },
    );
    successResponse(res, result);
  } catch (error) {
    next(error);
  }
}
