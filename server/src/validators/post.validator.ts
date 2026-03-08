import { z } from 'zod';
import { PostType } from '../types/enums';

export const createPostSchema = z
  .object({
    igAccountId: z.string().min(1, 'Instagram account ID is required'),
    type: z.enum([PostType.POST, PostType.STORY, PostType.REEL, PostType.CAROUSEL]),
    caption: z.string().max(2200, 'Caption must be 2200 characters or less').optional(),
    mediaUrls: z
      .array(z.string().url('Each media URL must be a valid URL'))
      .min(1, 'At least one media URL is required'),
    thumbnailUrl: z.string().url('Thumbnail URL must be a valid URL').optional(),
    scheduledAt: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: 'scheduledAt must be a valid ISO date string',
      })
      .optional(),
  })
  .refine(
    (data) => {
      if (data.type === PostType.CAROUSEL) {
        return data.mediaUrls.length >= 2 && data.mediaUrls.length <= 10;
      }
      return true;
    },
    {
      message: 'Carousel posts require between 2 and 10 media URLs',
      path: ['mediaUrls'],
    },
  );

export const updatePostSchema = z.object({
  igAccountId: z.string().min(1).optional(),
  type: z.enum([PostType.POST, PostType.STORY, PostType.REEL, PostType.CAROUSEL]).optional(),
  caption: z.string().max(2200).optional(),
  mediaUrls: z.array(z.string().url()).optional(),
  thumbnailUrl: z.string().url().optional().nullable(),
  scheduledAt: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'scheduledAt must be a valid ISO date string',
    })
    .optional()
    .nullable(),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
