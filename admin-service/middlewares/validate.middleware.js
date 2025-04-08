import { ZodError } from 'zod';
import logger from '../utils/logger.js';

export const validateMiddleware = (schema) => {
    return async (req, res, next) => {
        try {
            const validatedData = await schema.parseAsync(req.body);
            req.body = validatedData;
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                logger.warn('Ошибка валидации', {
                    path: req.path,
                    errors: error.errors
                });
                
                return res.status(400).json({
                    error: 'Ошибка валидации',
                    details: error.errors.map(err => ({
                        field: err.path.join('.'),
                        message: err.message
                    }))
                });
            }
            
            logger.error('Неожиданная ошибка при валидации', {
                path: req.path,
                error: error.message
            });
            
            return res.status(500).json({
                error: 'Внутренняя ошибка сервера при валидации'
            });
        }
    };
};
