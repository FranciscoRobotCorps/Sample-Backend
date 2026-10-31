import { z } from 'zod';

export const createNoteSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'title is required')
    .max(255, 'title must be at most 255 characters'),
  content: z
    .string()
    .trim()
    .optional()
    .or(z.literal('').transform(() => undefined)),
});

export const updateNoteSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'title cannot be empty')
      .max(255, 'title must be at most 255 characters')
      .optional(),
    content: z
      .string()
      .trim()
      .optional()
      .nullable()
      .or(z.literal('').transform(() => undefined)),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'At least one field must be provided' });

export const noteIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const listNotesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
export type ListNotesQuery = z.infer<typeof listNotesQuerySchema>;
