import logger from '../utils/logger.js';

const errorHandler = (err, req, res, next) => {
    logger.error('Unhandled error', {
        message: err.message,
        stack: err.stack,
        correlationId: req.correlationId,
    });

    const status = err.status || 500;

    res.status(status).json({
        error: {
            message: status === 500 ? 'Внутренняя ошибка сервера' : err.message,
            correlationId: req.correlationId,
        },
    });
};

export default errorHandler;
