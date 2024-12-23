import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Admin from '../models/admin.model.js';
import logger from '../utils/logger.js';

export const loginAdminService = async ({ username, password }) => {
    logger.info('loginAdminService: Начало входа администратора', { username });

    const admin = await Admin.findOne({ where: { username } });

    if (!admin) {
        logger.warn('loginAdminService: Администратор с таким ником не найден', { username });
        throw new Error('Неверный ник или пароль');
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
        logger.warn('loginAdminService: Неверный пароль', { username });
        throw new Error('Неверный ник или пароль');
    }

    const token = jwt.sign(
        { adminId: admin.id, username: admin.username, role: admin.role, city: admin.city },
        process.env.JWT_SECRET || 'your_jwt_secret',
        { expiresIn: '1d' }
    );

    logger.info('loginAdminService: Успешный вход администратора', { username, role: admin.role });

    return { token, role: admin.role, city: admin.city };
};

export const createAdminService = async ({ username, password, role, city }) => {
    logger.info('createAdminService: Создание администратора', { username });

    const existingAdmin = await Admin.findOne({ where: { username } });
    if (existingAdmin) {
        logger.warn('createAdminService: Ник уже используется', { username });
        throw new Error('Ник уже используется');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await Admin.create({ username, password: hashedPassword, role, city });
    logger.info('createAdminService: Администратор создан', { username, role });

    return admin;
};
