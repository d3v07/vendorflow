import { z } from 'zod';
import { paginationSchema, objectIdSchema } from './common.validator';

export const createUserSchema = z.object({
  body: z.object({
    email: z.string().email().max(255).toLowerCase().trim(),
    name: z.string().min(2).max(100).trim(),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(100)
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      ),
    role: z.enum(['admin', 'manager', 'viewer']).default('viewer'),
    isActive: z.boolean().optional().default(true),
  }),
});

export const updateUserSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
  body: z.object({
    email: z.string().email().max(255).toLowerCase().trim().optional(),
    name: z.string().min(2).max(100).trim().optional(),
    role: z.enum(['admin', 'manager', 'viewer']).optional(),
    isActive: z.boolean().optional(),
    avatar: z.string().url().max(500).optional().nullable(),
  }),
});

export const getUsersQuerySchema = z.object({
  query: paginationSchema.extend({
    role: z.enum(['admin', 'manager', 'viewer']).optional(),
    isActive: z.coerce.boolean().optional(),
    search: z.string().max(200).optional(),
  }),
});

export const getUserByIdSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
});

export const toggleUserActiveSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
});

export type CreateUserInput = z.infer<typeof createUserSchema>['body'];
export type UpdateUserInput = z.infer<typeof updateUserSchema>['body'];
export type GetUsersQuery = z.infer<typeof getUsersQuerySchema>['query'];
