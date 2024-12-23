import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import sequelize from '../utils/database.js';
import User from '../models/user.model.js';
import logger from '../utils/logger.js';
import Admin from "../models/admin.model.js";

dotenv.config();

const createAdmin = async () => {
    try {
        await sequelize.authenticate();
        logger.info('Успешное подключение к базе данных');

        await sequelize.sync();

        const existingAdmin = await Admin.findOne({ where: { username: 'sadmin' } });
        if (existingAdmin) {
            logger.info('Админ уже существует');
            return;
        }

        const hashedPassword = await bcrypt.hash('b@$T@xxx1Password', 10);

        const admin = await Admin.create({
            username: 'sadmin',
            password: hashedPassword,
            role: 'superadmin',
            isApproved: true
        });

        logger.info('Админ создан', { adminId: admin.id });
    } catch (error) {
        logger.error('Ошибка при создании админа', { error: error.message });
    } finally {
        await sequelize.close();
    }
};

createAdmin();

