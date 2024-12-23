import { z } from 'zod';

const reviewSchema = z.object({
    rideId: z.number().int(),
    passengerId: z.number().int(),
    driverId: z.number().int(),
    rating: z.number().int().min(1).max(5),
    comment: z.string().optional(),
});
