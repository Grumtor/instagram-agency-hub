import { z } from 'zod';
import { PostType } from '../types/enums';

export const bulkMediaUploadSchema = z.object({
  accountId: z.string().min(1, 'accountId is required'),
  startDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'startDate must be a valid date string',
    }),
});

export const bulkConfirmSchema = z.object({
  posts: z
    .array(
      z.object({
        igAccountId: z.string().min(1),
        type: z.enum([PostType.POST, PostType.STORY, PostType.REEL, PostType.CAROUSEL]),
        caption: z.string().max(2200).optional(),
        mediaUrls: z.array(z.string()).default([]),
        scheduledAt: z
          .string()
          .refine((val) => !isNaN(Date.parse(val)), {
            message: 'scheduledAt must be a valid ISO date string',
          })
          .optional(),
      }),
    )
    .min(1, 'posts array must not be empty')
    .max(100, 'Cannot confirm more than 100 posts at once'),
});

export type BulkMediaUploadInput = z.infer<typeof bulkMediaUploadSchema>;
export type BulkConfirmInput = z.infer<typeof bulkConfirmSchema>;
