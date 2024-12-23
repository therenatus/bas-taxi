import { z } from 'zod';

export const paymentDetailsSchema = z.object({
    passengerId: z.number().int().positive('ID пассажира должен быть положительным числом'),
    cardNumber: z.string().regex(/^\d{16}$/, 'Номер карты должен содержать ровно 16 цифр'),
    cardHolderName: z.string().min(2, 'Имя держателя карты должно содержать не менее 2 символов').max(50, 'Имя держателя карты не должно превышать 50 символов'),
    expirationDate: z.string().regex(/^\d{2}\/\d{2}$/, 'Дата истечения должна быть в формате MM/YY'),
    cvc: z.string().regex(/^\d{3}$/, 'CVC код должен содержать ровно 3 цифры'),
});
