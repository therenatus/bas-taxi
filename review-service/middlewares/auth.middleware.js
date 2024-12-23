import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';

const authMiddleware = (roles = []) => {
    if (typeof roles === 'string') {
        roles = [roles];
    }

    return (req, res, next) => {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ message: 'Нет токена авторизации' });
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Нет токена авторизации' });
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;

            if (roles.length && !roles.includes(decoded.role)) {
                return res.status(403).json({ message: 'Доступ запрещен' });
            }

            next();
        } catch (error) {
            logger.error('Ошибка при проверке JWT', { error: error.message });
            res.status(401).json({ message: 'Неверный токен' });
        }
    };
};

export default authMiddleware;
