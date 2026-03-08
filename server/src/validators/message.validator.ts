import { z } from 'zod';

export const sendMessageSchema = z.object({
  igAccountId: z.string().min(1, 'Instagram account ID is required'),
  recipientId: z.string().min(1, 'Recipient ID is required'),
  content: z
    .string()
    .min(1, 'Message content is required')
    .max(1000, 'Message content must be 1000 characters or less'),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
