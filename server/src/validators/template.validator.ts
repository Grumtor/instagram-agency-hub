import { z } from 'zod';

export const createTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  caption: z.string().min(1, 'Caption is required').max(2200, 'Caption must be 2200 characters or less'),
  hashtags: z.string().max(2200, 'Hashtags must be 2200 characters or less').optional(),
  category: z.string().max(100, 'Category must be 100 characters or less').optional(),
});

export const updateTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  caption: z.string().min(1).max(2200).optional(),
  hashtags: z.string().max(2200).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
});

export const createHashtagSetSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  hashtags: z.string().min(1, 'Hashtags are required').max(2200, 'Hashtags must be 2200 characters or less'),
});

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;
export type CreateHashtagSetInput = z.infer<typeof createHashtagSetSchema>;
