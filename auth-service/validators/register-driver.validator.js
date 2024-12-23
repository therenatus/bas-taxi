import { z } from 'zod';

export const driverRegisterSchema = z.object({
    phoneNumber: z.string().regex(/^\+\d{10,15}$/, 'Номер телефона должен соответствовать формату +1234567890'),
    fullName: z.string().min(1, 'Полное имя обязательно'),
    address: z.string().min(1, 'Адрес обязателен'),
    city: z.string().min(1, 'Город обязателен'),
    technicalPassport: z.string().optional(),
    carBrand: z.string().min(1, 'Марка автомобиля обязательна'),
    carModel: z.string().min(1, 'Модель автомобиля обязательна'),
    licensePlate: z.string().regex(/^[A-Z]{1,2}\d{3,4}[A-Z]{2,3}$/, 'Неверный формат гос номера'),
    manufactureDate: z.string().refine((date) => !isNaN(Date.parse(date)), 'Неверная дата производства'),
    vinCode: z.string().length(17, 'VIN код должен состоять из 17 символов'),
});
