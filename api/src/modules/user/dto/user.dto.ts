import { z } from 'zod';

export const loginSchema = z.object({
    account: z.string().min(1),
    password: z.string().min(6)
});

export const listQuerySchema = z.object({
    keyword: z.string().optional()
});
