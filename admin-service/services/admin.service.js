import { getChannel } from '../utils/rabbitmq.js';
import logger from '../utils/logger.js';
import bcrypt from 'bcryptjs';
import speakeasy from 'speakeasy';
import Admin from '../models/admin.model.js';

const API_GATEWAY_URL = process.env.API_GATEWAY_URL;

export const updateSettingsInService = async (settings) => {
    try {
        const channel = await getChannel();
        const exchangeName = 'settings_events';
        await channel.assertExchange(exchangeName, 'fanout', { durable: true });
        const message = {
            event: 'settings_updated',
            data: settings,
        };
        channel.publish(exchangeName, '', Buffer.from(JSON.stringify(message)));
        logger.info('Настройки опубликованы через RabbitMQ', message);
    } catch (error) {
        logger.error('Ошибка при публикации настроек в RabbitMQ', { error: error.message });
        throw error;
    }
};

export const getUserRidesFromGateway = async (userId, correlationId) => {
    try {
        const response = await axios.get(`${API_GATEWAY_URL}/user/${userId}/rides`, {
            headers: {
                'X-Correlation-ID': correlationId,
            },
        });

        if (response.status !== 200 || !response.data) {
            logger.error('Некорректный ответ от user-rides (user)', { status: response.status, correlationId });
            throw new Error('Ошибка при получении поездок пользователя');
        }

        logger.info('Успешно получены поездки пользователя через API Gateway', { userId, correlationId });
        return response.data;
    } catch (error) {
        logger.error('Ошибка при запросе к user-rides через API Gateway', { error: error.message, correlationId });
        throw new Error('Не удалось получить поездки пользователя');
    }
};

export const getDriverRidesFromGateway = async (driverId, correlationId) => {
    try {
        const response = await axios.get(`${API_GATEWAY_URL}/driver/${driverId}/rides`, {
            headers: {
                'X-Correlation-ID': correlationId,
            },
        });

        if (response.status !== 200 || !response.data) {
            logger.error('Некорректный ответ от driver-rides (driver)', { status: response.status, correlationId });
            throw new Error('Ошибка при получении поездок водителя');
        }

        logger.info('Успешно получены поездки водителя через API Gateway', { driverId, correlationId });
        return response.data;
    } catch (error) {
        logger.error('Ошибка при запросе к driver-rides через API Gateway', { error: error.message, correlationId });
        throw new Error('Не удалось получить поездки водителя');
    }
};

export const createTariffInService = async (tariffData, correlationId) => {
    try {
        const channel = await getChannel();
        const exchangeName = 'settings_events';
        await channel.assertExchange(exchangeName, 'fanout', { durable: true });
        
        const message = {
            event: 'tariff_created',
            data: tariffData,
            timestamp: new Date().toISOString()
        };
        
        channel.publish(exchangeName, '', Buffer.from(JSON.stringify(message)), {
            persistent: true,
            headers: { 'x-correlation-id': correlationId }
        });
        
        logger.info('Новый тариф опубликован через RabbitMQ', { 
            cityId: tariffData.cityId,
            carClassId: tariffData.carClassId,
            hour: tariffData.hour,
            correlationId 
        });
        
        return message;
    } catch (error) {
        logger.error('Ошибка при публикации нового тарифа в RabbitMQ', { 
            error: error.message,
            correlationId 
        });
        throw error;
    }
};

export const createAdminService = async ({ email, password, role, city }, correlationId) => {
    logger.info('Создание администратора', { email, correlationId });
    const existing = await Admin.findOne({ where: { email } });
    if (existing) {
        logger.warn('Email уже используется', { email, correlationId });
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

    logger.info('Администратор успешно создан с включенной 2FA', { email, role, correlationId });
    return { admin, otpauth_url: secret.otpauth_url };
};

export const getAdminByIdService = async (id, correlationId) => {
    logger.info('Получение администратора по ID', { id, correlationId });
    const admin = await Admin.findByPk(id, { attributes: ['id', 'email', 'role', 'city', 'createdAt'] });
    if (!admin) {
        logger.warn('Администратор не найден', { id, correlationId });
        throw new Error('Администратор не найден');
    }
    return admin;
};



