import { z } from 'zod';

export const createTodoSchema = z.object({
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
});

export const updateTodoSchema = z
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
    done: z.coerce.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'At least one field must be provided' });

export const todoIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const listTodosQuerySchema = z.object({
  done: z.preprocess(
    (val) => val === 'true' || val === '1',
    z.boolean().optional(),
  ),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type CreateTodoInput = z.infer<typeof createTodoSchema>;
export type UpdateTodoInput = z.infer<typeof updateTodoSchema>;
export type ListTodosQuery = z.infer<typeof listTodosQuerySchema>;
