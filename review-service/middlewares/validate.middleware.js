import { ZodError } from 'zod';

export const validate = (schema) => (req, res, next) => {
    try {
        schema.parse(req.body);
        next();
    } catch (error) {
        if (error instanceof ZodError) {
            res.status(400).json({ errors: error.errors });
        } else {
            next(error);
        }
    }
};
