import { z } from 'zod';

export const createAdminSchema = z.object({
    username: z.string().min(3, 'Никнейм должен содержать не менее 3 символов').max(30, 'Никнейм не должен превышать 30 символов'),
    password: z.string().min(6, 'Пароль должен содержать не менее 6 символов').max(100, 'Пароль не должен превышать 100 символов'),
    role: z.enum(['admin', 'moderator'], 'Роль должна быть admin или moderator'),
    city: z.string().min(2, 'Город должен содержать не менее 2 символов').max(50, 'Город не должен превышать 50 символов').optional(), // Город обязателен только для модераторов
}).refine((data) => {
    return !(data.role === 'moderator' && !data.city);

}, {
    message: 'Город обязателен для роли moderator',
    path: ['city'],
});