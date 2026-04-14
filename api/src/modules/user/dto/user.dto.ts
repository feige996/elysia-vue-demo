import { z } from 'zod';

export const loginSchema = z.object({
  account: z.string().min(1),
  password: z.string().min(6),
});

export const listQuerySchema = z.object({
  keyword: z.string().optional(),
});

export const pageQuerySchema = z.object({
  keyword: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(50).default(10),
});

export const createUserSchema = z.object({
  account: z.string().min(1).max(64),
  name: z.string().min(1).max(64),
  role: z.enum(['admin', 'editor']),
});

export const updateUserSchema = z.object({
  account: z.string().min(1).max(64).optional(),
  name: z.string().min(1).max(64).optional(),
  role: z.enum(['admin', 'editor']).optional(),
});

export const idParamSchema = z.object({
  id: z.coerce.number().int().min(1),
});

export const batchDeleteSchema = z.object({
  ids: z.array(z.coerce.number().int().min(1)).min(1),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(1),
});

export const createRoleSchema = z.object({
  code: z.string().min(1).max(64),
  name: z.string().min(1).max(64),
  description: z.string().max(255).nullable().optional(),
  status: z.coerce.number().int().min(0).max(1).optional(),
});

export const updateRoleSchema = z.object({
  code: z.string().min(1).max(64).optional(),
  name: z.string().min(1).max(64).optional(),
  description: z.string().max(255).nullable().optional(),
});

export const updateRoleStatusSchema = z.object({
  status: z.coerce.number().int().min(0).max(1),
});

export const assignRolePermissionsSchema = z.object({
  permissionIds: z.array(z.coerce.number().int().min(1)),
});

export const assignRoleMenusSchema = z.object({
  menuIds: z.array(z.coerce.number().int().min(1)),
});
