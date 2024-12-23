import { z } from 'zod';

export const requestRideSchema = z.object({
    body: z.object({
        pickupLocation: z.string().nonempty(),
        dropoffLocation: z.string().nonempty(),
    }),
});