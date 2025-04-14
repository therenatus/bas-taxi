// admin.controller.js

import axios from 'axios';
import dotenv from 'dotenv';
import logger from '../utils/logger.js';
import { updateSettingsInService, createTariffInService } from '../services/admin.service.js';
import { getChannel, publishToRabbitMQ } from '../utils/rabbitmq.js';
import DriverRequest from "../models/driver-request.model.js";

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
    const adminId = req.user.adminId;

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

export const getRidesByTimeRange = async (req, res) => {
    const { startTime, endTime } = req.query;
    const correlationId = req.headers['x-correlation-id'] || req.headers['correlationid'];

    try {
        if (!startTime || !endTime) {
            return res.status(400).json({ 
                error: 'Необходимо указать начало и конец временного промежутка' 
            });
        }

        const response = await axios.get(`${API_GATEWAY_URL}/rides/time-range`, {
            params: { startTime, endTime },
            headers: {
                Authorization: req.headers.authorization,
                'X-Correlation-ID': correlationId
            }
        });

        logger.info('Данные о поездках по временному промежутку успешно получены', { 
            startTime, endTime, correlationId 
        });
        
        res.status(200).json(response.data);
    } catch (error) {
        logger.error('Ошибка при получении поездок по временному промежутку', { 
            error: error.message || 'Неизвестная ошибка', 
            startTime, 
            endTime,
            correlationId
        });
        
        res.status(error.response?.status || 500).json({ 
            error: error.response?.data?.error || 'Ошибка при получении поездок по временному промежутку' 
        });
    }
};

export const blockUserViaGateway = async (req, res) => {
    const { userId } = req.params;
    const { reason } = req.body;
    const correlationId = req.headers['x-correlation-id'] || req.headers['correlationid'];
    
    if (!userId) {
        return res.status(400).json({ error: 'Не указан ID пассажира' });
    }
    
    if (!reason) {
        return res.status(400).json({ error: 'Необходимо указать причину блокировки' });
    }
    
    try {
        const response = await axios.post(
            `${API_GATEWAY_URL}/auth/passenger/${userId}/block`, 
            { reason },
            {
                headers: {
                    Authorization: req.headers.authorization,
                    'X-Correlation-ID': correlationId
                }
            }
        );
        
        logger.info('Пассажир успешно заблокирован через API Gateway', { 
            userId, 
            correlationId 
        });
        
        res.status(200).json(response.data);
    } catch (error) {
        logger.error('Ошибка при блокировке пассажира через API Gateway', { 
            error: error.message, 
            userId,
            correlationId 
        });
        
        res.status(error.response?.status || 500).json({ 
            error: error.response?.data?.error || 'Не удалось заблокировать пассажира' 
        });
    }
};

export const createAdmin = async (req, res) => {
    try {
        const response = await axios.post(`${API_GATEWAY_URL}/auth/admin/create`, req.body, {
            headers: {
                Authorization: req.headers.authorization,
                'X-Correlation-ID': req.headers['x-correlation-id']
            }
        });
        res.status(201).json(response.data);
    } catch (error) {
        logger.error('Ошибка при создании администратора через API Gateway', { 
            error: error.message,
            correlationId: req.headers['x-correlation-id']
        });
        res.status(error.response?.status || 500).json({ 
            error: 'Ошибка при создании администратора',
            details: error.response?.data || error.message
        });
    }
};

export const getAdminById = async (req, res) => {
    const { id } = req.params;
    try {
        const response = await axios.get(`${API_GATEWAY_URL}/auth/admin/${id}`, {
            headers: {
                Authorization: req.headers.authorization,
                'X-Correlation-ID': req.headers['x-correlation-id']
            }
        });
        console.log({response});
        res.status(200).json(response.data);
    } catch (error) {
        logger.error('Ошибка при получении администратора через API Gateway', { 
            error: error.message,
            correlationId: req.headers['x-correlation-id']
        });
        res.status(error.response?.status || 500).json({ 
            error: 'Ошибка при получении администратора',
            details: error.response?.data || error.message
        });
    }
};

export const blockDriverViaGateway = async (req, res) => {
    const { driverId } = req.params;
    const { reason } = req.body;
    const correlationId = req.headers['x-correlation-id'] || req.headers['correlationid'];
    
    if (!driverId) {
        return res.status(400).json({ error: 'Не указан ID водителя' });
    }
    
    if (!reason) {
        return res.status(400).json({ error: 'Необходимо указать причину блокировки' });
    }
    
    try {
        const response = await axios.post(
            `${API_GATEWAY_URL}/auth/driver/${driverId}/block`, 
            { reason },
            {
                headers: {
                    Authorization: req.headers.authorization,
                    'X-Correlation-ID': correlationId
                }
            }
        );
        
        logger.info('Водитель успешно заблокирован через API Gateway', { 
            driverId, 
            correlationId 
        });
        
        res.status(200).json(response.data);
    } catch (error) {
        logger.error('Ошибка при блокировке водителя через API Gateway', { 
            error: error.message, 
            driverId,
            correlationId 
        });
        
        res.status(error.response?.status || 500).json({ 
            error: error.response?.data?.error || 'Не удалось заблокировать водителя' 
        });
    }
};

export const unblockUserViaGateway = async (req, res) => {
    const { userId } = req.params;
    const correlationId = req.headers['x-correlation-id'] || req.headers['correlationid'];
    
    if (!userId) {
        return res.status(400).json({ error: 'Не указан ID пассажира' });
    }
    
    try {
        const response = await axios.post(
            `${API_GATEWAY_URL}/auth/passenger/${userId}/unblock`,
            {},
            {
                headers: {
                    Authorization: req.headers.authorization,
                    'X-Correlation-ID': correlationId
                }
            }
        );
        
        logger.info('Пассажир успешно разблокирован через API Gateway', { 
            userId, 
            correlationId 
        });
        
        res.status(200).json(response.data);
    } catch (error) {
        logger.error('Ошибка при разблокировке пассажира через API Gateway', { 
            error: error.message, 
            userId,
            correlationId 
        });
        
        res.status(error.response?.status || 500).json({ 
            error: error.response?.data?.error || 'Не удалось разблокировать пассажира' 
        });
    }
};

export const unblockDriverViaGateway = async (req, res) => {
    const { driverId } = req.params;
    const correlationId = req.headers['x-correlation-id'] || req.headers['correlationid'];
    
    if (!driverId) {
        return res.status(400).json({ error: 'Не указан ID водителя' });
    }
    
    try {
        const response = await axios.post(
            `${API_GATEWAY_URL}/auth/driver/${driverId}/unblock`,
            {},
            {
                headers: {
                    Authorization: req.headers.authorization,
                    'X-Correlation-ID': correlationId
                }
            }
        );
        
        logger.info('Водитель успешно разблокирован через API Gateway', { 
            driverId, 
            correlationId 
        });
        
        res.status(200).json(response.data);
    } catch (error) {
        logger.error('Ошибка при разблокировке водителя через API Gateway', { 
            error: error.message, 
            driverId,
            correlationId 
        });
        
        res.status(error.response?.status || 500).json({ 
            error: error.response?.data?.error || 'Не удалось разблокировать водителя' 
        });
    }
};