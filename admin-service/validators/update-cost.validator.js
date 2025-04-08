import { z } from 'zod';

const monthSchema = z.enum(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'], {
    errorMap: () => ({ message: 'Месяц должен быть числом от 1 до 12' })
});

export const updateCostSchema = z.object({
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
    updates: z.object({
        baseFare: z.number().positive().optional(),
        costPerKm: z.number().positive().optional(),
        costPerMinute: z.number().positive().optional(),
        serviceFeePercent: z.number().min(0).max(100).optional(),
        seasonalMultiplier: z.number().min(0.1).max(5).optional()
            .describe('Сезонный коэффициент для корректировки цен в зависимости от сезона'),
        description: z.string().min(1).max(255).optional()
            .describe('Описание тарифа, например "Летний тариф для премиум класса"')
    }).strict().refine(
        data => Object.keys(data).length > 0,
        {
            message: 'Необходимо указать хотя бы одно поле для обновления'
        }
    )
}).strict();
