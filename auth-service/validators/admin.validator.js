import { z } from 'zod';

export const createAdminSchema = z.object({
    email: z.string()
        .email('Некорректный email')
        .min(5, 'Email должен содержать не менее 5 символов')
        .max(100, 'Email не должен превышать 100 символов'),
    password: z.string()
        .min(6, 'Пароль должен содержать не менее 6 символов')
        .max(100, 'Пароль не должен превышать 100 символов'),
    role: z.enum(['admin', 'moderator'], { required_error: 'Роль обязательна' }),
    city: z.string()
        .min(2, 'Город должен содержать не менее 2 символов')
        .max(50, 'Город не должен превышать 50 символов')
        .optional(),
}).refine((data) => {
    return !(data.role === 'moderator' && !data.city);
}, {
    message: 'Город обязателен для роли moderator',
    path: ['city'],
});
