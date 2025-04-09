import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import logger from '../utils/logger.js';

dotenv.config();

export const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
        logger.warn('Отсутствует заголовок Authorization');
        return res.status(401).json({ error: 'Требуется авторизация' });
    }
    
    const parts = authHeader.split(' ');
    
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        logger.warn('Неверный формат токена авторизации');
        return res.status(401).json({ error: 'Неверный формат токена авторизации' });
    }
    
    const token = parts[1];
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
        req.user = decoded;
        logger.info('Токен успешно проверен', { userId: decoded.userId, role: decoded.role });
        next();
    } catch (error) {
        logger.warn('Недействительный токен', { error: error.message });
        return res.status(401).json({ error: 'Недействительный токен' });
    }
};

export const authorize = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            logger.warn('Пользователь не аутентифицирован');
            return res.status(401).json({ error: 'Требуется авторизация' });
        }
        
        const userRole = req.user.role;
        
        if (!roles.includes(userRole)) {
            logger.warn('Доступ запрещен: недостаточно прав', { 
                userRole, 
                requiredRoles: roles 
            });
            return res.status(403).json({ 
                error: 'Доступ запрещен: недостаточно прав',
                userRole,
                requiredRoles: roles
            });
        }
        
        logger.info('Авторизация успешна', { userId: req.user.userId, role: userRole });
        next();
    };
};

export const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'Token is missing' });

    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Token is missing' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }
        next();
    } catch (error) {
        res.status(401).json({ message: 'Invalid token' });
    }
};
