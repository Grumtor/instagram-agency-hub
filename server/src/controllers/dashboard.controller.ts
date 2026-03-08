import { Request, Response, NextFunction } from 'express';
import * as dashboardService from '../services/dashboard.service';
import { successResponse } from '../utils/apiResponse';

export async function getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const stats = await dashboardService.getStats(req.params.workspaceId as string);
    successResponse(res, stats);
  } catch (error) {
    next(error);
  }
}
