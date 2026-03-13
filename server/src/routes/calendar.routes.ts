import { Router, Request, Response, NextFunction } from 'express';
import * as calendarController from '../controllers/calendar.controller';
import { requireAuth } from '../middleware/auth';
import { requireWorkspaceAccess } from '../middleware/workspaceAccess';
import { validate } from '../middleware/validate';
import { calendarQuerySchema, rescheduleSchema } from '../validators/calendar.validator';
import { ValidationError } from '../utils/errors';
import { ZodError } from 'zod';

const router = Router({ mergeParams: true });

router.use(requireAuth);
router.use(requireWorkspaceAccess());

// Validate query params for the calendar endpoint
function validateQuery(schema: typeof calendarQuerySchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details: Record<string, string[]> = {};
        for (const issue of error.issues) {
          const path = issue.path.join('.');
          if (!details[path]) details[path] = [];
          details[path].push(issue.message);
        }
        next(new ValidationError('Validation failed', details));
      } else {
        next(error);
      }
    }
  };
}

router.get('/', validateQuery(calendarQuerySchema), calendarController.getCalendar);
router.patch('/:postId/reschedule', validate(rescheduleSchema), calendarController.reschedulePost);

export default router;
