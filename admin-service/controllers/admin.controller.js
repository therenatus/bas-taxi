// admin.controller.js

import axios from 'axios';
import dotenv from 'dotenv';
import logger from '../utils/logger.js';
import { updateSettingsInService, createTariffInService, createAdminService, getAdminByIdService } from '../services/admin.service.js';
import { getChannel } from '../utils/rabbitmq.js';
import DriverRequest from "../models/driver-request.model.js";
import { publishToRabbitMQ } from '../services/admin.service.js';
import { API_GATEWAY_URL } from '../config/config.js';

dotenv.config();

const API_GATEWAY_URL = process.env.API_GATEWAY_URL;

export const getUsers = async (req, res) => {
    try {
        const response = await axios.get(`${API_GATEWAY_URL}/auth/users`, {
            headers: {
                Authorization: req.headers.authorization,
            },
            timeout: 5000,
        });
        res.json(response.data);
    } catch (error) {
        logger.error('Ошибка при получении списка пользователей', { error: error.message });
        res.status(500).json({ error: 'Ошибка при получении списка пользователей' });
    }
};

export const getDriverRequests = async (req, res) => {
    try {
        const requests = await DriverRequest.findAll({ where: { status: 'pending' } });
        res.json(requests);
    } catch (error) {
        logger.error('Ошибка при получении заявок водителей', { error: error.message });
        res.status(500).json({ error: 'Ошибка при получении заявок водителей' });
    }
};

export const getDriverDetails = async (req, res) => {
    const { id } = req.params;
    try {
        const response = await axios.get(`${API_GATEWAY_URL}/auth/driver/${id}`, {
            headers: {
                Authorization: req.headers.authorization,
            },
        });

        res.status(200).json(response.data);
    } catch (error) {
        if (error.response && error.response.status === 404) {
            logger.warn(`Driver с id=${id} не найден`);
            return res.status(404).json({ error: 'Водитель не найден' });
        }

        logger.error('Ошибка при получении данных водителя', { error: error.message });
        res.status(500).json({ error: 'Ошибка при получении данных водителя' });
    }
};

export const approveDriver = async (req, res) => {
    const { requestId } = req.params;

    try {
        const driverRequest = await DriverRequest.findByPk(requestId);
        if (!driverRequest) {
            return res.status(404).json({ message: 'Заявка водителя не найдена' });
        }

        if (driverRequest.status !== 'pending') {
            return res.status(400).json({ message: 'Заявка уже обработана' });
        }

        const channel = await getChannel();
        const exchangeName = 'driver_approval';
        await channel.assertExchange(exchangeName, 'fanout', { durable: true });
        const approvalMessage = { driverId: driverRequest.driverId };
        channel.publish(exchangeName, '', Buffer.from(JSON.stringify(approvalMessage)), {
            persistent: true,
        });
        logger.info('Сообщение об одобрении водителя отправлено в RabbitMQ', approvalMessage);

        driverRequest.status = 'approved';
        await driverRequest.save();

        res.json({ message: 'Водитель успешно одобрен' });
    } catch (error) {
        logger.error('Ошибка при одобрении водителя', { error: error.message });
        res.status(500).json({ error: 'Ошибка при одобрении водителя' });
    }
};

export const rejectDriver = async (req, res) => {
    const { requestId } = req.params;
    const { reason } = req.body;

    try {
        const driverRequest = await DriverRequest.findByPk(requestId);
        if (!driverRequest) {
            return res.status(404).json({ message: 'Заявка водителя не найдена' });
        }

        if (driverRequest.status !== 'pending') {
            return res.status(400).json({ message: 'Заявка уже обработана' });
        }

        const channel = await getChannel();
        const exchangeName = 'driver_rejection';
        await channel.assertExchange(exchangeName, 'fanout', { durable: true });
        const rejectionMessage = { driverId: driverRequest.driverId };
        channel.publish(exchangeName, '', Buffer.from(JSON.stringify(rejectionMessage)), {
            persistent: true,
        });
        logger.info('Сообщение об отклонении водителя отправлено в RabbitMQ', rejectionMessage);

        driverRequest.status = 'rejected';
        driverRequest.reason = reason;
        await driverRequest.save();

        res.json({ message: 'Водитель успешно отклонён' });
    } catch (error) {
        logger.error('Ошибка при отклонении водителя', { error: error.message });
        res.status(500).json({ error: 'Ошибка при отклонении водителя' });
    }
};

export const getRides = async (req, res) => {
    try {
        const response = await axios.get(`${API_GATEWAY_URL}/rides`, {
            headers: {
                Authorization: req.headers.authorization,
            },
            timeout: 5000,
        });
        res.json(response.data);
    } catch (error) {
        logger.error('Ошибка при получении списка поездок', { error: error.message });
        res.status(500).json({ error: 'Ошибка при получении списка поездок' });
    }
};

export const getReviews = async (req, res) => {
    try {
        const response = await axios.get(`${API_GATEWAY_URL}/reviews`, {
            headers: {
                Authorization: req.headers.authorization,
            },
            timeout: 5000,
        });
        res.json(response.data);
    } catch (error) {
        logger.error('Ошибка при получении отзывов', { error: error.message });
        res.status(500).json({ error: 'Ошибка при получении отзывов' });
    }
};

export const updateSettings = async (req, res) => {
    const { cityId, carClassId, hour, month, updates } = req.body;
    const correlationId = req.headers['x-correlation-id'];
    const adminId = req.user.id;

    try {
        const message = await updateSettingsInService({
            cityId,
            carClassId,
            hour,
            month,
            ...updates
        }, correlationId, adminId);

        logger.info('Настройки тарифа успешно обновлены', { 
            cityId, 
            carClassId, 
            hour,
            month,
            correlationId,
            adminId
        });

        res.json({ 
            message: 'Настройки тарифа успешно обновлены',
            data: message
        });
    } catch (error) {
        logger.error('Ошибка при обновлении настроек тарифа', { 
            error: error.message,
            cityId,
            carClassId,
            hour,
            month,
            correlationId
        });
        res.status(500).json({ error: 'Ошибка при обновлении настроек тарифа' });
    }
};

export const getUserRidesViaGateway = async (req, res) => {
    const { userId } = req.params;
    const correlationId = req.headers['x-correlation-id'];

    try {
        const response = await axios.get(`${API_GATEWAY_URL}/rides/user/${userId}/rides`, {
            headers: {
                Authorization: req.headers.authorization,
                'X-Correlation-ID': correlationId,
            },
        });
        res.status(200).json(response.data);
    } catch (error) {
        logger.error('Ошибка при получении поездок пользователя через API Gateway', { error: error.message, correlationId });
        res.status(500).json({ error: 'Не удалось получить поездки пользователя' });
    }
};

export const getDriverRidesViaGateway = async (req, res) => {
    const { driverId } = req.params;
    const correlationId = req.headers['x-correlation-id'];

    try {
        const response = await axios.get(`${API_GATEWAY_URL}/rides/driver/${driverId}/rides`, {
            headers: {
                Authorization: req.headers.authorization,
                'X-Correlation-ID': correlationId,
            },
        });
        res.status(200).json(response.data);
    } catch (error) {
        logger.error('Ошибка при получении поездок водителя через API Gateway', { error: error.message, correlationId });
        res.status(500).json({ error: 'Не удалось получить поездки водителя' });
    }
};

export const createAdmin = async (req, res) => {
    const correlationId = req.headers['x-correlation-id'] || req.headers['correlationid'];
    logger.info('Начало создания администратора', { correlationId });
    
    try {
        const result = await createAdminService(req.body, correlationId);
        
        res.status(201).json({ 
            message: 'Администратор успешно создан с включенной 2FA', 
            otpauth_url: result.otpauth_url 
        });
    } catch (error) {
        logger.error('Ошибка при создании администратора', { error: error.message, correlationId });
        if (error.message === 'Email уже используется') {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
};

export const getAdminById = async (req, res) => {
    const { id } = req.params;
    const correlationId = req.headers['x-correlation-id'] || req.headers['correlationid'];
    logger.info('Начало получения данных администратора', { id, correlationId });
    
    try {
        const admin = await getAdminByIdService(id, correlationId);
        res.status(200).json(admin);
    } catch (error) {
        logger.error('Ошибка при получении данных администратора', { error: error.message, id, correlationId });
        if (error.message === 'Администратор не найден') {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
};

export {
    getUsers,
    approveDriver,
    getRides,
    getReviews,
    updateSettings,
    getDriverRequests,
    rejectDriver,
    getDriverDetails,
    getUserRidesViaGateway,
    getDriverRidesViaGateway
};
