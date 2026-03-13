import { z } from 'zod';

export const calendarQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'month must be in YYYY-MM format'),
  igAccountId: z.string().optional(),
});

export const rescheduleSchema = z.object({
  scheduledAt: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'scheduledAt must be a valid ISO date string',
    }),
});

export type CalendarQueryInput = z.infer<typeof calendarQuerySchema>;
export type RescheduleInput = z.infer<typeof rescheduleSchema>;
