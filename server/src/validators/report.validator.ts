import { z } from 'zod';

export const generateReportSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less'),
  accountIds: z
    .array(z.string().min(1))
    .min(1, 'At least one account ID is required'),
  startDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'startDate must be a valid ISO date string',
    }),
  endDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'endDate must be a valid ISO date string',
    }),
}).refine(
  (data) => new Date(data.startDate) <= new Date(data.endDate),
  {
    message: 'startDate must be before or equal to endDate',
    path: ['startDate'],
  },
);

export type GenerateReportInput = z.infer<typeof generateReportSchema>;
