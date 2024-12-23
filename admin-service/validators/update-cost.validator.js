import { z } from 'zod';

export const updateCostSchema = z.object({
    body: z.object({
        city: z.string(),
        baseFare: z.number().positive(),
        costPerKm: z.number().positive(),
        costPerMinute: z.number().positive(),
    }),
});
