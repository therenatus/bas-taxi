import { ApplicationError } from '../../../application/exceptions/application.error.js';

export const errorHandler = (err, req, res, next) => {
    if (err instanceof ApplicationError) {
        return res.status(err.status).json({
            error: {
                code: err.code,
                message: err.message
            }
        });
    }

    console.error('Unhandled error:', err);
    res.status(500).json({
        error: {
            code: 'INTERNAL_ERROR',
            message: 'Internal server error'
        }
    });
};