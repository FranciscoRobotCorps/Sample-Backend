import { z } from 'zod';

export const createSubscriptionSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'title is required')
    .max(255, 'title must be at most 255 characters'),
  description: z
    .string()
    .trim()
    .max(1024, 'description must be at most 1024 characters')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  status: z.enum(['active', 'inactive', 'archived']).optional(),
  category_id: z.coerce.number().int().positive().optional(),
  tags: z.any().optional(),
});

export const updateSubscriptionSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'title cannot be empty')
      .max(255, 'title must be at most 255 characters')
      .optional(),
    description: z
      .string()
      .trim()
      .max(1024, 'description must be at most 1024 characters')
      .optional()
      .nullable()
      .or(z.literal('').transform(() => undefined)),
    status: z.enum(['active', 'inactive', 'archived']).optional(),
    category_id: z.coerce.number().int().positive().optional(),
    tags: z.any().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'At least one field must be provided' });

export const subscriptionIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const listSubscriptionsQuerySchema = z.object({
  status: z.preprocess(
    (val) => val === 'true' || val === '1',
    z.enum(['active', 'inactive', 'archived']).optional(),
  ),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;
export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>;
export type ListSubscriptionsQuery = z.infer<typeof listSubscriptionsQuerySchema>;
