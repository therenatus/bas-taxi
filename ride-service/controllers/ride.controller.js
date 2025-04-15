import {
    acceptRide,
    activateDriverLine,
    activateParkingMode,
    cancelRideByPassenger,
    cancelRideIfPassengerNotArrived,
    completeRide,
    createRideWithoutPassenger,
    deactivateDriverLine,
    deactivateParkingMode,
    getAllUserRides,
    getDriverDetails,
    getDriverRides,
    getRideDetails,
    getRideInfo,
    getUserRides,
    onsiteRide,
    requestRide,
    startRide,
    startRideByQR,
    updateRideStatus
} from '../services/ride.service.js';

import {
    addHoliday,
    addTariff,
    deleteHoliday,
    deleteHourAdjustment,
    deleteMonthAdjustment,
    getTariff,
    updateBaseTariff,
    updateHoliday,
    updateHourAdjustment,
    updateMonthAdjustment
} from '../services/tariff.service.js';

import { Op } from 'sequelize';
import Ride from '../models/ride.model.js';
import { findNearbyParkedDrivers } from "../services/location.serrvice.js";
import logger from '../utils/logger.js';

export const requestRideHandler = async (req, res) => {
    try {
        const { origin, destination, paymentType = 'cash' } = req.body;
        const passengerId = req.user.userId;
        const correlationId = req.correlationId;

        if (!['cash', 'card'].includes(paymentType)) {
            return res.status(400).json({ error: 'Некорректный тип оплаты', correlationId });
        }

        const ride = await requestRide(passengerId, origin, destination, paymentType, correlationId);

        ride.price = ride.price.toString();

        res.status(201).json({ message: 'Поездка успешно создана', ride });
    } catch (error) {
        logger.error('Ошибка при создании поездки', { error: error.message, correlationId: req.correlationId });
        res.status(400).json({ error: error.message, correlationId: req.correlationId });
    }
};


export const cancelRideHandler = async (req, res) => {
    try {
        const { rideId } = req.params;
        const { cancellationReason } = req.body;
        const passengerId = req.user.userId;
        const correlationId = req.correlationId;

        const ride = await cancelRideByPassenger(rideId, passengerId, cancellationReason, correlationId);

        ride.price = ride.price.toString();

        res.status(200).json({ message: 'Поездка успешно отменена', ride });
    } catch (error) {
        logger.error('Ошибка при отмене поездки', { error: error.message, correlationId: req.correlationId });
        res.status(400).json({ error: error.message });
    }
};


export const acceptRideHandler = async (req, res) => {
    try {
        const { rideId } = req.body;
        const driverId = req.user.driverId;
        const correlationId = req.correlationId;

        const ride = await acceptRide(rideId, driverId, correlationId);

        ride.price = ride.price.toString();

        res.status(200).json({ message: 'Поездка успешно принята', ride });
    } catch (error) {
        logger.error('Ошибка при принятии поездки водителем', { error: error.message, correlationId: req.correlationId });
        res.status(400).json({ error: error.message, correlationId: req.correlationId });
    }
};

export const onsiteRideHandler = async (req, res) => {
    try {
        const { rideId } = req.params;
        const driverId = req.user.driverId;
        const correlationId = req.correlationId;

        const ride = await onsiteRide(rideId, driverId, correlationId);

        ride.price = ride.price.toString();

        res.status(200).json({ message: 'Водитель на месте', ride });
    } catch (error) {
        logger.error('Ошибка при принятии поездки водителем', { error: error.message, correlationId: req.correlationId });
        res.status(400).json({ error: error.message, correlationId: req.correlationId });
    }
};

export const completeRideHandler = async (req, res) => {
    const { rideId } = req.params;
    const driverId = req.user.driverId;
    const correlationId = req.correlationId;

    try {
        const ride = await completeRide(rideId, driverId, correlationId);

        ride.price = ride.price.toString();

        res.status(200).json({
            message: 'Поездка завершена',
            ride,
        });
    } catch (error) {
        logger.error('Ошибка при завершении поездки', {
            error: error.message,
            correlationId,
        });
        res.status(400).json({
            error: error.message,
            correlationId,
        });
    }
};

export const startRideHandler = async (req, res) => {
    try {
        const { rideId } = req.params;
        const driverId = req.user.driverId;
        const correlationId = req.correlationId;

        if (!rideId) {
            return res.status(400).json({ error: 'Необходимо указать идентификатор поездки' });
        }

        const ride = await startRide(rideId, driverId, correlationId);

        ride.price = ride.price.toString();

        res.status(200).json({ message: 'Поездка успешно началась', ride });
    } catch (error) {
        logger.error('Ошибка при начале поездки', { error: error.message, correlationId: req.correlationId });
        res.status(400).json({ error: error.message, correlationId: req.correlationId });
    }
};

export const createRideWithoutPassengerHandler = async (req, res) => {
    try {
        const { origin, destination } = req.body;
        const driverId = req.user.driverId;
        const correlationId = req.correlationId;

        const ride = await createRideWithoutPassenger(driverId, origin, destination, correlationId);

        ride.price = ride.price.toString();

        res.status(201).json({ message: 'Поездка успешно создана водителем', ride });
    } catch (error) {
        logger.error('Ошибка при создании поездки водителем', { error: error.message, correlationId: req.correlationId });
        res.status(400).json({ error: error.message, correlationId: req.correlationId });
    }
};

export const startRideByQRHandler = async (req, res) => {
    try {
        const { driverId, origin, destination, paymentType = 'cash' } = req.body;
        const passengerId = req.user.userId;
        const correlationId = req.correlationId;

        if (!['cash', 'card'].includes(paymentType)) {
            return res.status(400).json({ error: 'Некорректный тип оплаты', correlationId });
        }

        const ride = await startRideByQR(passengerId, driverId, origin, destination, paymentType, correlationId);

        ride.price = ride.price.toString();

        res.status(201).json({ message: 'Поездка успешно начата после сканирования QR-кода', ride });
    } catch (error) {
        logger.error('Ошибка при создании поездки через QR-код', { error: error.message, correlationId: req.correlationId });
        res.status(400).json({ error: error.message, correlationId: req.correlationId });
    }
};

export const updateRideStatusHandler = async (req, res) => {
    try {
        const { rideId, status } = req.body;
        const driverId = req.user.driverId;
        const userRole = req.user.role;
        const correlationId = req.correlationId;

        const ride = await updateRideStatus(rideId, status, driverId, userRole, correlationId);

        ride.price = ride.price.toString();

        res.status(200).json({ message: 'Статус поездки обновлен', ride });
    } catch (error) {
        logger.error('Ошибка при обновлении статуса поездки', { error: error.message, correlationId: req.correlationId });
        res.status(400).json({ error: error.message, correlationId: req.correlationId });
    }
};

export const getRideInfoHandler = async (req, res) => {
    try {
        const { origin, destination } = req.body;
        const correlationId = req.correlationId;

        const info = await getRideInfo(origin, destination, correlationId);

        res.status(200).json({ message: 'Информация о поездке получена', info });
    } catch (error) {
        logger.error('Ошибка при получении информации о поездке', { error: error.message, correlationId: req.correlationId });
        res.status(400).json({ error: error.message, correlationId: req.correlationId });
    }
};

export const activateParkingModeHandler = async (req, res) => {
    try {
        const driverId = req.user.driverId;
        const { latitude, longitude } = req.body;
        const correlationId = req.correlationId;

        if (!latitude || !longitude) {
            return res.status(400).json({ error: 'Необходимо указать координаты' });
        }

        await activateParkingMode(driverId, latitude, longitude, correlationId);

        res.status(200).json({ message: 'Режим парковки активирован' });
    } catch (error) {
        logger.error('Ошибка при активации режима парковки', { error: error.message, correlationId: req.correlationId });
        res.status(400).json({ error: error.message, correlationId: req.correlationId });
    }
}

export const deactivateParkingModeHandler = async (req, res) => {
    try {
        const driverId = req.user.driverId;
        const correlationId = req.correlationId;

        await deactivateParkingMode(driverId, correlationId);

        res.status(200).json({ message: 'Режим парковки деактивирован' });
    } catch (error) {
        logger.error('Ошибка при деактивации режима парковки', { error: error.message, correlationId });
        res.status(400).json({ error: error.message });
    }
};

export const getNearbyParkedDriversHandler = async (req, res) => {
    try {
        const { latitude, longitude, radius = 5 } = req.query;

        if (!latitude || !longitude) {
            return res.status(400).json({ error: 'Необходимо указать координаты (latitude, longitude)' });
        }

        const drivers = await findNearbyParkedDrivers(parseFloat(latitude), parseFloat(longitude), parseFloat(radius));

        res.status(200).json({ drivers });
    } catch (error) {
        logger.error('Ошибка при получении припаркованных водителей', { error: error.message });
        res.status(400).json({ error: error.message });
    }
};

export const activateLineHandler = async (req, res) => {
    try {
        const driverId = req.user.driverId;
        const { latitude, longitude } = req.body;

        if (!latitude || !longitude) {
            return res.status(400).json({ error: 'Необходимо указать координаты' });
        }

        await activateDriverLine(driverId, latitude, longitude);

        res.status(200).json({ message: 'Водитель вышел на линию' });
    } catch (error) {
        logger.error('Ошибка при активации линии водителя', { error: error.message, driverId: req.user.driverId });
        res.status(500).json({ error: 'Не удалось выйти на линию' });
    }
};

export const deactivateLineHandler = async (req, res) => {
    try {
        const driverId = req.user.driverId;

        await deactivateDriverLine(driverId);

        res.status(200).json({ message: 'Водитель вышел с линии' });
    } catch (error) {
        logger.error('Ошибка при деактивации линии водителя', { error: error.message, driverId: req.user.driverId });
        res.status(500).json({ error: 'Не удалось выйти с линии' });
    }
};

export const getDriverDetailsHandler = async (req, res) => {
    const { driverId } = req.params;

    if (!driverId) {
        return res.status(400).json({ error: 'Не указан driverId' });
    }

    try {
        const driverData = await getDriverDetails(driverId);

        if (!driverData) {
            return res.status(404).json({ error: 'Данные о водителе не найдены' });
        }

        res.status(200).json(driverData);
    } catch (error) {
        logger.error('Ошибка при получении данных о водителе через RabbitMQ', { error: error.message });
        res.status(500).json({ error: 'Не удалось получить данные о водителе' });
    }
};

export const getRideDetailsHandler = async (req, res) => {
    const { rideId } = req.params;

    if (!rideId) {
        return res.status(400).json({ error: 'Не указан rideId' });
    }

    try {
        const rideData = await getRideDetails(rideId);

        if (!rideData) {
            return res.status(404).json({ error: 'Данные о поездке не найдены' });
        }

        rideData.price = rideData.price.toString();
        res.status(200).json(rideData);
    } catch (error) {
        logger.error('Ошибка при получении данных о поездке через RabbitMQ', { error: error.message });
        res.status(500).json({ error: 'Не удалось получить данные о поездке' });
    }
};

export const getUserRidesHandler = async (req, res) => {
    const { userId } = req.params;

    if (!userId) {
        return res.status(400).json({ error: 'Не указан userId' });
    }

    try {
        const userRides = await getUserRides(userId);

        if (!userRides) {
            return res.status(404).json({ error: `Данные о поездках с userId: ${userId} не найдены` });
        }

        res.status(200).json(userRides);
    } catch (error) {
        logger.error('Ошибка при получении данных о поездках через RabbitMQ', { error: error.message });
        res.status(500).json({ error: 'Не удалось получить данные о поездках' });
    }
};

export const getDriverRidesHandler = async (req, res) => {
    const { driverId } = req.params;

    if (!driverId) {
        return res.status(400).json({ error: 'Не указан driverId' });
    }

    try {
        const userRides = await getDriverRides(driverId);

        if (!userRides) {
            return res.status(404).json({ error: `Данные о поездках с driverId: ${driverId} не найдены` });
        }

        res.status(200).json(userRides);
    } catch (error) {
        logger.error('Ошибка при получении данных о поездках через RabbitMQ', { error: error.message });
        res.status(500).json({ error: 'Не удалось получить данные о поездках' });
    }
};

export const getTariffHandler = async (req, res) => {
    try {
        const { cityId } = req.params;
        const correlationId = req.correlationId;

        const tariffs = await getTariff(parseInt(cityId));

        res.status(200).json({ 
            message: 'Тарифы успешно получены', 
            tariffs 
        });
    } catch (error) {
        logger.error('Ошибка при получении тарифов', { 
            error: error.message, 
            correlationId: req.correlationId 
        });
        
        if (error.message === 'Тарифы не найдены') {
            return res.status(404).json({ 
                error: error.message, 
                correlationId: req.correlationId 
            });
        }
        
        res.status(500).json({ 
            error: 'Ошибка при получении тарифов', 
            correlationId: req.correlationId 
        });
    }
};

export const updateBaseTariffHandler = async (req, res) => {
    try {
        const { cityId, carClassId, baseFare, costPerKm, costPerMinute, reason } = req.body;
        const adminId = req.user.adminId || req.user.userId;
        const correlationId = req.correlationId;

        const tariff = await updateBaseTariff(
            cityId, 
            carClassId, 
            parseFloat(baseFare), 
            parseFloat(costPerKm), 
            parseFloat(costPerMinute), 
            adminId, 
            reason
        );

        res.status(200).json({ 
            message: 'Базовый тариф успешно обновлен', 
            tariff 
        });
    } catch (error) {
        logger.error('Ошибка при обновлении базового тарифа', { 
            error: error.message, 
            correlationId: req.correlationId 
        });
        
        if (error.message === 'Тариф не найден') {
            return res.status(404).json({ 
                error: error.message, 
                correlationId: req.correlationId 
            });
        }
        
        res.status(500).json({ 
            error: 'Ошибка при обновлении базового тарифа', 
            correlationId: req.correlationId 
        });
    }
};

export const updateHourAdjustmentHandler = async (req, res) => {
    try {
        const { cityId, carClassId, hour, percent, reason } = req.body;
        const adminId = req.user.adminId || req.user.userId;
        const correlationId = req.correlationId;

        // Проверки входных данных
        if (hour < 0 || hour > 23) {
            return res.status(400).json({ 
                error: 'Некорректное значение часа (должно быть от 0 до 23)', 
                correlationId 
            });
        }

        const tariff = await updateHourAdjustment(
            cityId, 
            carClassId, 
            hour, 
            parseFloat(percent), 
            adminId,
            reason
        );

        res.status(200).json({ 
            message: `Часовая корректировка для ${hour}:00 успешно обновлена`, 
            tariff 
        });
    } catch (error) {
        logger.error('Ошибка при обновлении часовой корректировки', { 
            error: error.message, 
            correlationId: req.correlationId 
        });
        
        if (error.message === 'Тариф не найден') {
            return res.status(404).json({ 
                error: error.message, 
                correlationId: req.correlationId 
            });
        }
        
        res.status(500).json({ 
            error: 'Ошибка при обновлении часовой корректировки', 
            correlationId: req.correlationId 
        });
    }
};

export const deleteHourAdjustmentHandler = async (req, res) => {
    try {
        const { cityId, carClassId, hour, reason } = req.body;
        const adminId = req.user.adminId || req.user.userId;
        const correlationId = req.correlationId;

        // Проверки входных данных
        if (hour < 0 || hour > 23) {
            return res.status(400).json({ 
                error: 'Некорректное значение часа (должно быть от 0 до 23)', 
                correlationId 
            });
        }

        const tariff = await deleteHourAdjustment(
            cityId, 
            carClassId, 
            hour, 
            adminId,
            reason
        );

        res.status(200).json({ 
            message: `Часовая корректировка для ${hour}:00 успешно удалена`, 
            tariff 
        });
    } catch (error) {
        logger.error('Ошибка при удалении часовой корректировки', { 
            error: error.message, 
            correlationId: req.correlationId 
        });
        
        if (error.message.includes('не найден')) {
            return res.status(404).json({ 
                error: error.message, 
                correlationId: req.correlationId 
            });
        }
        
        res.status(500).json({ 
            error: 'Ошибка при удалении часовой корректировки', 
            correlationId: req.correlationId 
        });
    }
};

export const updateMonthAdjustmentHandler = async (req, res) => {
    try {
        const { cityId, carClassId, month, percent, reason } = req.body;
        const adminId = req.user.adminId || req.user.userId;
        const correlationId = req.correlationId;

        // Проверки входных данных
        if (month < 1 || month > 12) {
            return res.status(400).json({ 
                error: 'Некорректное значение месяца (должно быть от 1 до 12)', 
                correlationId 
            });
        }

        const tariff = await updateMonthAdjustment(
            cityId, 
            carClassId, 
            month, 
            parseFloat(percent), 
            adminId,
            reason
        );

        res.status(200).json({ 
            message: `Месячная корректировка для месяца ${month} успешно обновлена`, 
            tariff 
        });
    } catch (error) {
        logger.error('Ошибка при обновлении месячной корректировки', { 
            error: error.message, 
            correlationId: req.correlationId 
        });
        
        if (error.message === 'Тариф не найден') {
            return res.status(404).json({ 
                error: error.message, 
                correlationId: req.correlationId 
            });
        }
        
        res.status(500).json({ 
            error: 'Ошибка при обновлении месячной корректировки', 
            correlationId: req.correlationId 
        });
    }
};

export const deleteMonthAdjustmentHandler = async (req, res) => {
    try {
        const { cityId, carClassId, month, reason } = req.body;
        const adminId = req.user.adminId || req.user.userId;
        const correlationId = req.correlationId;

        // Проверки входных данных
        if (month < 1 || month > 12) {
            return res.status(400).json({ 
                error: 'Некорректное значение месяца (должно быть от 1 до 12)', 
                correlationId 
            });
        }

        const tariff = await deleteMonthAdjustment(
            cityId, 
            carClassId, 
            month, 
            adminId,
            reason
        );

        res.status(200).json({ 
            message: `Месячная корректировка для месяца ${month} успешно удалена`, 
            tariff 
        });
    } catch (error) {
        logger.error('Ошибка при удалении месячной корректировки', { 
            error: error.message, 
            correlationId: req.correlationId 
        });
        
        if (error.message.includes('не найден')) {
            return res.status(404).json({ 
                error: error.message, 
                correlationId: req.correlationId 
            });
        }
        
        res.status(500).json({ 
            error: 'Ошибка при удалении месячной корректировки', 
            correlationId: req.correlationId 
        });
    }
};

export const addHolidayHandler = async (req, res) => {
    try {
        const { cityId, carClassId, month, day, percent, reason } = req.body;
        const adminId = req.user.adminId || req.user.userId;
        const correlationId = req.correlationId;

        // Проверки входных данных
        if (month < 1 || month > 12) {
            return res.status(400).json({ 
                error: 'Некорректное значение месяца (должно быть от 1 до 12)', 
                correlationId 
            });
        }

        if (day < 1 || day > 31) {
            return res.status(400).json({ 
                error: 'Некорректное значение дня (должно быть от 1 до 31)', 
                correlationId 
            });
        }

        const tariff = await addHoliday(
            cityId, 
            carClassId, 
            parseInt(month), 
            parseInt(day), 
            parseFloat(percent), 
            adminId,
            reason
        );

        res.status(201).json({ 
            message: `Праздничный день ${day}.${month} успешно добавлен`, 
            tariff 
        });
    } catch (error) {
        logger.error('Ошибка при добавлении праздничного дня', { 
            error: error.message, 
            correlationId: req.correlationId 
        });
        
        if (error.message === 'Тариф не найден') {
            return res.status(404).json({ 
                error: error.message, 
                correlationId: req.correlationId 
            });
        }

        if (error.message.includes('уже существует')) {
            return res.status(400).json({ 
                error: error.message, 
                correlationId: req.correlationId 
            });
        }
        
        res.status(500).json({ 
            error: 'Ошибка при добавлении праздничного дня', 
            correlationId: req.correlationId 
        });
    }
};

export const updateHolidayHandler = async (req, res) => {
    try {
        const { cityId, carClassId, month, day, percent, reason } = req.body;
        const adminId = req.user.adminId || req.user.userId;
        const correlationId = req.correlationId;

        // Проверки входных данных
        if (month < 1 || month > 12) {
            return res.status(400).json({ 
                error: 'Некорректное значение месяца (должно быть от 1 до 12)', 
                correlationId 
            });
        }

        if (day < 1 || day > 31) {
            return res.status(400).json({ 
                error: 'Некорректное значение дня (должно быть от 1 до 31)', 
                correlationId 
            });
        }

        const tariff = await updateHoliday(
            cityId, 
            carClassId, 
            parseInt(month), 
            parseInt(day), 
            parseFloat(percent), 
            adminId,
            reason
        );

        res.status(200).json({ 
            message: `Праздничный день ${day}.${month} успешно обновлен`, 
            tariff 
        });
    } catch (error) {
        logger.error('Ошибка при обновлении праздничного дня', { 
            error: error.message, 
            correlationId: req.correlationId 
        });
        
        if (error.message.includes('не найден')) {
            return res.status(404).json({ 
                error: error.message, 
                correlationId: req.correlationId 
            });
        }
        
        res.status(500).json({ 
            error: 'Ошибка при обновлении праздничного дня', 
            correlationId: req.correlationId 
        });
    }
};

export const deleteHolidayHandler = async (req, res) => {
    try {
        const { cityId, carClassId, month, day, reason } = req.body;
        const adminId = req.user.adminId || req.user.userId;
        const correlationId = req.correlationId;

        // Проверки входных данных
        if (month < 1 || month > 12) {
            return res.status(400).json({ 
                error: 'Некорректное значение месяца (должно быть от 1 до 12)', 
                correlationId 
            });
        }

        if (day < 1 || day > 31) {
            return res.status(400).json({ 
                error: 'Некорректное значение дня (должно быть от 1 до 31)', 
                correlationId 
            });
        }

        const tariff = await deleteHoliday(
            cityId, 
            carClassId, 
            parseInt(month), 
            parseInt(day), 
            adminId,
            reason
        );

        res.status(200).json({ 
            message: `Праздничный день ${day}.${month} успешно удален`, 
            tariff 
        });
    } catch (error) {
        logger.error('Ошибка при удалении праздничного дня', { 
            error: error.message, 
            correlationId: req.correlationId 
        });
        
        if (error.message.includes('не найден')) {
            return res.status(404).json({ 
                error: error.message, 
                correlationId: req.correlationId 
            });
        }
        
        res.status(500).json({ 
            error: 'Ошибка при удалении праздничного дня', 
            correlationId: req.correlationId 
        });
    }
};

export const getRidesByTimeRange = async (req, res) => {
    const { startTime, endTime } = req.query;

    try {
        const rides = await Ride.findAll({
            where: {
                createdAt: {
                    [Op.between]: [new Date(startTime), new Date(endTime)],
                },
            },
        });
        res.status(200).json(rides);
    } catch (error) {
        logger.error('Ошибка при получении поездок по временным промежуткам', { error: error.message });
        res.status(500).json({ error: 'Ошибка при получении поездок' });
    }
};

/**
 * Обработчик запроса на получение всех поездок текущего пользователя (водителя или пассажира)
 * 
 * @route GET /rides/driver/rides/my
 * @route GET /rides/user/rides/my
 * @route GET /rides/my
 * @route GET /rides/my-rides
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.user - Информация о пользователе из middleware аутентификации
 * @param {string} req.user.userId - ID пассажира (если запрос от пассажира)
 * @param {string} req.user.driverId - ID водителя (если запрос от водителя)
 * @param {string} req.user.role - Роль пользователя ('driver' или 'passenger')
 * @param {Object} res - Express response object
 * 
 * @returns {Object} 200 - Массив поездок пользователя
 * @returns {Object} 400 - Ошибка валидации ID пользователя
 * @returns {Object} 500 - Ошибка сервера
 */
export const getAllUserRidesHandler = async (req, res) => {
    const userId = req.user.userId ? req.user.userId : req.user.driverId;
    const userType = req.user.role === 'driver' ? 'driver' : 'passenger';
    const correlationId = req.headers['x-correlation-id'] || req.correlationId;

    try {
        if (!userId) {
            logger.error('ID пользователя не найден в токене', { userType, correlationId });
            return res.status(400).json({ error: 'ID пользователя не найден' });
        }

        const rides = await getAllUserRides(userId, userType, correlationId);
        
        if (rides.length === 0) {
            return res.status(200).json([]);
        }
        
        // Преобразуем числовые значения в строки для совместимости с клиентом
        const formattedRides = rides.map(ride => {
            return {
                ...ride.toJSON(),
                price: ride.price ? ride.price.toString() : null
            };
        });
        
        res.status(200).json(formattedRides);
    } catch (error) {
        logger.error('Ошибка при получении всех поездок пользователя', { 
            error: error.message,
            userId,
            userType,
            correlationId
        });
        res.status(500).json({ 
            error: 'Не удалось получить данные о поездках',
            details: error.message
        });
    }
};

export const cancelRideIfPassengerNotArrivedHandler = async (req, res) => {
    const { rideId } = req.params;
    const driverId = req.user.id;
    const correlationId = req.headers['x-correlation-id'] || req.correlationId;

    try {
        const result = await cancelRideIfPassengerNotArrived(rideId);
        
        logger.info('Поездка успешно отменена из-за неявки пассажира', { 
            rideId, 
            driverId, 
            correlationId 
        });
        
        res.status(200).json({ 
            message: 'Поездка успешно отменена из-за неявки пассажира',
            details: result
        });
    } catch (error) {
        logger.error('Ошибка при отмене поездки', { 
            error: error.message,
            rideId,
            driverId,
            correlationId
        });
        
        res.status(400).json({ 
            error: 'Не удалось отменить поездку',
            details: error.message
        });
    }
};

/**
 * Создание нового тарифа
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const createTariffHandler = async (req, res) => {
    const correlationId = req.headers['x-correlation-id'] || 'none';
    const adminId = req.headers['x-admin-id'];
    
    try {
        // Валидация обязательных полей
        const requiredFields = ['cityId', 'carClassId', 'baseFare', 'costPerKm', 'costPerMinute'];
        for (const field of requiredFields) {
            if (!req.body[field]) {
                throw new Error(`Отсутствует обязательное поле: ${field}`);
            }
        }

        const tariffData = {
            ...req.body,
            hourlyAdjustments: req.body.hourlyAdjustments || {},
            monthlyAdjustments: req.body.monthlyAdjustments || {},
            holidayAdjustments: req.body.holidayAdjustments || [],
            isActive: true
        };

        logger.info('Создание нового тарифа', {
            correlationId,
            adminId,
            cityId: tariffData.cityId,
            carClassId: tariffData.carClassId
        });

        const newTariff = await addTariff(tariffData, adminId);

        logger.info('Тариф успешно создан', {
            correlationId,
            adminId,
            tariffId: newTariff.id,
            cityId: newTariff.cityId,
            carClassId: newTariff.carClassId
        });

        res.status(201).json({
            message: 'Тариф успешно создан',
            data: newTariff
        });
    } catch (error) {
        logger.error('Ошибка при создании тарифа', {
            error: error.message,
            correlationId,
            adminId,
            body: req.body
        });

        if (error.message.includes('уже существует')) {
            return res.status(409).json({
                error: 'Тариф с такими параметрами уже существует',
                details: error.message
            });
        }

        res.status(500).json({
            error: 'Ошибка при создании тарифа',
            details: error.message
        });
    }
};

