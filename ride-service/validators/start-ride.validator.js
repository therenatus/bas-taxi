import { z } from 'zod';

export const startRideByQrSchema = z.object({
    body: z.object({
        qrCodeData: z.string().nonempty(),
    }),
});