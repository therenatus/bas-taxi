import { z } from 'zod';

export const passengerRegisterSchema = z.object({
    phoneNumber: z.string(),
});
