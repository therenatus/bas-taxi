import { z } from 'zod';

export const rejectDriverSchema = z.object({
    body: z.object({
        reason: z.string().min(8, { message: "Reason must be at least 8 characters long" }).trim(),
    }),
});