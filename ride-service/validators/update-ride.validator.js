import { z } from 'zod';

export const updateRideStatusSchema = z.object({
    body: z.object({
        rideId: z.string().uuid(),
        status: z.enum(['in_progress', 'completed', 'cancelled']),
    }),
});