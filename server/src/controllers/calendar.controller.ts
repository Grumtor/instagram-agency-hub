import { Request, Response, NextFunction } from 'express';
import * as calendarService from '../services/calendar.service';
import { successResponse } from '../utils/apiResponse';
import { UnauthorizedError, ValidationError } from '../utils/errors';
import type { CalendarQueryInput, RescheduleInput } from '../validators/calendar.validator';

export async function getCalendar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { month, igAccountId } = req.query as unknown as CalendarQueryInput;
    const result = await calendarService.getCalendarPosts(
      req.params.workspaceId as string,
      month,
      igAccountId,
    );
    successResponse(res, result);
  } catch (error) {
    next(error);
  }
}

export async function reschedulePost(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const { scheduledAt } = req.body as RescheduleInput;
    const result = await calendarService.reschedulePost(
      req.params.postId as string,
      req.params.workspaceId as string,
      scheduledAt,
      req.user.id,
    );
    successResponse(res, result);
  } catch (error) {
    next(error);
  }
}
