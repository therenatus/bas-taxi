import { z } from 'zod';

export const verifyPhoneSchema = z.object({
    body: z.object({
        phoneNumber: z.string().nonempty('Номер телефона обязателен'),
        code: z.string().nonempty('Код подтверждения обязателен'),
    }),
});
