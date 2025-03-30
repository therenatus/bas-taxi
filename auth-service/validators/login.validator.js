import { z } from 'zod';

export const loginSchema = z.object({
    phoneNumber: z.string(),
});

export const confirmLoginSchema = z.object({
    phoneNumber: z.string(),
    verificationCode: z.string().length(4, 'Код должен состоять из 4 символов'),
});

export const adminLoginSchema = z.object({
    email: z.string()
        .email('Введите корректный email')
        .min(5, 'Email должен содержать не менее 5 символов')
        .max(100, 'Email не должен превышать 100 символов'),

    password: z.string()
        .min(6, 'Пароль должен содержать не менее 6 символов')
        .max(100, 'Пароль не должен превышать 100 символов'),

    twoFactorToken: z.string()
        .length(6, 'Код 2FA должен содержать ровно 6 цифр')
        .regex(/^[0-9]{6}$/, 'Код 2FA должен состоять только из цифр'),
});

