import { z } from 'zod';

export const createAdminSchema = z.object({
    email: z.string().email({ message: 'Некорректный email' }),
    password: z.string().min(8, { message: 'Пароль должен быть не менее 8 символов' }),
    role: z.enum(['admin', 'moderator', 'superadmin'], {
        errorMap: () => ({ message: 'Роль должна быть admin, moderator или superadmin' })
    }),
    city: z.string().optional().refine(
        (val) => {
            // Если роль модератор, то город обязателен
            return true;
        },
        {
            message: 'Для модератора обязательно указать город',
            path: ['city']
        }
    )
}); 