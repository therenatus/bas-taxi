import logger from '../utils/logger.js';

const errorHandler = (err, req, res, next) => {
    logger.error('Unhandled error', { error: err.message });
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
};

export default errorHandler;
