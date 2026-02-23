import { z } from 'zod';

// SECURITY: Using .strict() to reject unexpected fields (prevents field injection)
export const registerSchema = z.object({
  body: z.object({
    tenantName: z.string().min(2).max(100).trim(),
    name: z.string().min(2).max(100).trim(),
    email: z.string().email().max(255).toLowerCase().trim(),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(100)
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      ),
  }).strict(),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email().max(255).toLowerCase().trim(),
    password: z.string().min(1, 'Password is required'),
  }).strict(),
});

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }).strict(),
});

export const logoutSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }).strict(),
});

export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>['body'];
export type LogoutInput = z.infer<typeof logoutSchema>['body'];
