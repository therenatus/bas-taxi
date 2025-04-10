import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import Admin from '../models/admin.model.js';
import logger from '../utils/logger.js';

export const createAdminService = async ({ email, password, role, city }) => {
    logger.info('Создание администратора', { email, role });
    const existing = await Admin.findOne({ where: { email } });
    if (existing) {
        logger.warn('Email уже используется', { email });
        throw new Error('Email уже используется');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const secret = speakeasy.generateSecret({ length: 20 });

    const admin = await Admin.create({
        email,
        password: hashedPassword,
        role,
        city,
        twoFactorSecret: secret.base32,
        twoFactorEnabled: true
    });

    logger.info('Администратор успешно создан с включенной 2FA', { email, role });
    
    // Возвращаем информацию, которую суперадмин передаст пользователю
    return {
        id: admin.id,
        email: admin.email,
        password: password, // Нешифрованный пароль для передачи
        role: admin.role,
        city: admin.city,
        twoFactorSecret: secret.base32,
        createdAt: admin.createdAt
    };
};

export const loginAdminService = async ({ email, password, twoFactorToken }) => {
    logger.info('Вход администратора', { email });
    const admin = await Admin.findOne({ where: { email } });
    if (!admin) {
        logger.warn('Неверный email или пароль', { email });
        throw new Error('Неверный email или пароль');
    }

    const validPassword = await bcrypt.compare(password, admin.password);
    if (!validPassword) {
        logger.warn('Неверный email или пароль', { email });
        throw new Error('Неверный email или пароль');
    }

    const verified = speakeasy.totp.verify({
        secret: admin.twoFactorSecret,
        encoding: 'base32',
        token: twoFactorToken,
        digits: 6,
        window: 1 // Допускаем небольшую погрешность во времени
    });

    if (!verified) {
        logger.warn('Неверный двухфакторный код', { email });
        throw new Error('Неверный двухфакторный код');
    }

    const token = jwt.sign({ adminId: admin.id, email: admin.email, role: admin.role, city: admin.city }, process.env.JWT_SECRET, { expiresIn: '1d' });

    logger.info('Администратор успешно вошёл в систему', { email, role: admin.role });
    return { token, role: admin.role, city: admin.city };
};

export const getAdminByIdService = async (id) => {
    logger.info('Получение администратора по ID', { id });
    const admin = await Admin.findByPk(id, { attributes: ['id', 'email', 'role', 'city', 'createdAt'] });
    if (!admin) {
        logger.warn('Администратор не найден', { id });
        throw new Error('Администратор не найден');
    }
    return admin;
};