import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import speakeasy from 'speakeasy';
import sequelize from '../utils/database.js';
import logger from '../utils/logger.js';
import Admin from "../models/admin.model.js";

dotenv.config();

const createSuperAdmin = async () => {
    try {
        await sequelize.authenticate();
        logger.info('Успешное подключение к базе данных');

        await sequelize.sync();

        const email = 'superadmin@example.com'; // Рекомендуется вынести в .env
        const existingAdmin = await Admin.findOne({ where: { email } });
        
        if (existingAdmin) {
            logger.info('Суперадмин уже существует');
            return;
        }

        // Генерация секрета для 2FA
        const secret = speakeasy.generateSecret({ length: 20 });
        const hashedPassword = await bcrypt.hash('b@$T@xxx1Password', 10);

        const admin = await Admin.create({
            email,
            password: hashedPassword,
            role: 'superadmin',
            city: 'ALL', // Суперадмин имеет доступ ко всем городам
            twoFactorSecret: secret.base32,
            twoFactorEnabled: true
        });

        logger.info('Суперадмин успешно создан', { 
            adminId: admin.id,
            email: admin.email,
            otpauthUrl: secret.otpauth_url 
        });
        
        // Выводим QR-код URL для настройки 2FA
        console.log('\n=== Важно: Сохраните эту информацию ===');
        console.log('OTP Auth URL:', secret.otpauth_url);
        console.log('2FA Secret:', secret.base32);
        console.log('=====================================\n');

    } catch (error) {
        logger.error('Ошибка при создании суперадмина', { error: error.message });
        throw error;
    } finally {
        await sequelize.close();
    }
};

createSuperAdmin().catch(console.error);

