import {
    requestRide,
    createRideWithoutPassenger,
    startRideByQR,
    updateRideStatus,
    getRideInfo,
    activateParkingMode,
    acceptRide,
    cancelRideByPassenger,
    deactivateParkingMode,
    deactivateDriverLine,
    activateDriverLine, completeRide, startRide,
} from '../services/ride.service.js';
import logger from '../utils/logger.js';
import {findNearbyDrivers, findNearbyParkedDrivers} from "../services/location.serrvice.js";

export const requestRideHandler = async (req, res) => {
    try {
        const { origin, destination, paymentType = 'cash' } = req.body;
        const passengerId = req.user.userId;
        const correlationId = req.correlationId;

        if (!['cash', 'card'].includes(paymentType)) {
            return res.status(400).json({ error: 'Некорректный тип оплаты', correlationId });
        }

        const ride = await requestRide(passengerId, origin, destination, paymentType, correlationId);

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

        res.status(200).json({ message: 'Поездка успешно принята', ride });
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

        res.status(201).json({ message: 'Поездка успешно создана водителем', ride });
    } catch (error) {
        logger.error('Ошибка при создании поездки водителем', { error: error.message, correlationId: req.correlationId });
        res.status(400).json({ error: error.message, correlationId: req.correlationId });
    }
};

export const startRideByQRHandler = async (req, res) => {
    try {
        const { qrCodeData, destination, paymentType = 'card' } = req.body;
        const passengerId = req.user.userId;
        const correlationId = req.correlationId;

        if (!['cash', 'card'].includes(paymentType)) {
            return res.status(400).json({ error: 'Некорректный тип оплаты', correlationId });
        }

        const ride = await startRideByQR(passengerId, qrCodeData, destination, paymentType, correlationId);

        res.status(201).json({ message: 'Поездка успешно начата после сканирования QR-кода', ride });
    } catch (error) {
        logger.error('Ошибка при создании поездки через QR-код', { error: error.message, correlationId: req.correlationId });
        res.status(400).json({ error: error.message, correlationId: req.correlationId });
    }
};

export const updateRideStatusHandler = async (req, res) => {
    try {
        const { rideId, status } = req.body;
        const userId = req.user.driverId;
        const userRole = req.user.role;
        const correlationId = req.correlationId;

        const ride = await updateRideStatus(rideId, status, userId, userRole, correlationId);

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
        console.log({ driverId})
        const { latitude, longitude } = req.body;
        console.log({ latitude, longitude });
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