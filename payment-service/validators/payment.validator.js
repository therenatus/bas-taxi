import { z } from 'zod';

export const initiatePaymentSchema = z.object({
    body: z.object({
        rideId: z.string().uuid(),
        amount: z.number().positive(),
    }),
});