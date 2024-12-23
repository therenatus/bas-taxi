import { z } from 'zod';

export const loginSchema = z.object({
    phoneNumber: z.string(),
});

export const confirmLoginSchema = z.object({
    phoneNumber: z.string(),
    verificationCode: z.string().length(4, 'Код должен состоять из 4 символов'),
});

export const adminLoginSchema = z.object({
    username: z.string(),
    password: z.string(),
});
