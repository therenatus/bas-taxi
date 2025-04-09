import { z } from 'zod';

/**
 * Схема валидации для регистрации водителя
 */
export const registerDriverSchema = z.object({
    phoneNumber: z.string()
        .regex(/^\+[1-9]\d{1,14}$/, { message: 'Номер телефона должен быть в формате +XXXXXXXXXXX' })
        .min(1, { message: 'Номер телефона обязателен' }),
    
    fullName: z.string()
        .min(3, { message: 'Имя должно содержать не менее 3 символов' })
        .max(50, { message: 'Имя должно содержать не более 50 символов' }),
    
    address: z.string()
        .min(3, { message: 'Адрес должен содержать не менее 3 символов' })
        .optional(),
    
    city: z.string()
        .min(2, { message: 'Город должен содержать не менее 2 символов' }),
    
    carBrand: z.string()
        .min(1, { message: 'Марка автомобиля обязательна' }),
    
    carModel: z.string()
        .min(1, { message: 'Модель автомобиля обязательна' }),
    
    licensePlate: z.string()
        .min(1, { message: 'Номер автомобиля обязателен' }),
    
    manufactureDate: z.string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Дата выпуска должна быть в формате YYYY-MM-DD' }),
    
    vinCode: z.string()
        .min(1, { message: 'VIN-код автомобиля обязателен' })
}).strict();

/**
 * Схема валидации для входа водителя
 */
export const loginDriverSchema = z.object({
    phoneNumber: z.string()
        .regex(/^\+[1-9]\d{1,14}$/, { message: 'Номер телефона должен быть в формате +XXXXXXXXXXX' })
        .min(1, { message: 'Номер телефона обязателен' })
}).strict(); 