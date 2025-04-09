import { z } from 'zod';

export const createAdminSchema = z.object({
    email: z.string({
        required_error: 'Email обязателен',
        invalid_type_error: 'Email должен быть строкой'
    })
    .email({ message: 'Email должен быть корректным адресом электронной почты' })
    .min(1, { message: 'Email не может быть пустым' }),
    
    password: z.string({
        required_error: 'Пароль обязателен',
        invalid_type_error: 'Пароль должен быть строкой'
    })
    .min(8, { message: 'Пароль должен содержать не менее 8 символов' }),
    
    role: z.enum(['admin', 'moderator'], {
        message: 'Роль должна быть "admin" или "moderator"'
    })
    .describe('Роль пользователя (admin или moderator)')
    .default('admin'),
    
    city: z.string({
        invalid_type_error: 'Город должен быть строкой'
    })
    .min(1, { message: 'Город не может быть пустым' })
    .optional()
    .refine(
        (val, ctx) => {
            if (ctx.data.role === 'moderator' && !val) {
                return false;
            }
            return true;
        },
        { message: 'Город обязателен для модератора' }
    )
}).strict(); 