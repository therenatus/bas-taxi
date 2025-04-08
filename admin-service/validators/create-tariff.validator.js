import { z } from 'zod';

const monthSchema = z.enum(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'], {
    errorMap: () => ({ message: 'Месяц должен быть числом от 1 до 12' })
});

export const createTariffSchema = z.object({
    cityId: z.number().int().positive({
        message: 'ID города должен быть положительным числом'
    }),
    carClassId: z.number().int().positive({
        message: 'ID класса автомобиля должен быть положительным числом'
    }),
    hour: z.number().int().min(0).max(23, {
        message: 'Час должен быть от 0 до 23'
    }),
    month: monthSchema,
    baseFare: z.number().positive({
        message: 'Базовая стоимость должна быть положительным числом'
    }),
    costPerKm: z.number().positive({
        message: 'Стоимость за километр должна быть положительным числом'
    }),
    costPerMinute: z.number().positive({
        message: 'Стоимость за минуту должна быть положительным числом'
    }),
    serviceFeePercent: z.number().min(0).max(100, {
        message: 'Процент комиссии должен быть от 0 до 100'
    }),
    seasonalMultiplier: z.number().min(0.1).max(5).optional().default(1.0),
    description: z.string().min(1).max(255).optional()
        .describe('Описание тарифа, например "Летний тариф для премиум класса"')
}).strict(); 