// src/services/ride.service.js
import Ride from '../models/ride.model.js';
import sequelize from '../utils/database.js';
import { initiatePayment, cancelPayment } from './payment.service.js';
import {assertExchange, getChannel} from '../utils/rabbitmq.js';
import logger from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
import {
    getCityFromCoordinates,
    getDistanceAndDurationFromGeoService,
    sendRideRequestToGeoService,
    updateDriverLocationInGeoService
} from './geo.service.js';
import { validateCitySupported, calculatePriceForCity } from './tariff.service.js';
import {emitParkingStatus, emitRideUpdate, emitToDriver, emitToPassenger} from './websoket.service.js';
import {
    addParkedDriverLocation,
    findNearbyDrivers,
    removeDriverLocation,
    removeParkedDriverLocation,
    updateDriverLocation
} from "./location.serrvice.js";
import {cancelRideNotifications, notifyNearbyDrivers} from "./notification.service.js";
import Driver from "../models/driver.model.js";


const ensureCitySupportedAndGetPrice = async (city, distance, duration) => {
    const supported = await validateCitySupported(city);
    if (!supported) {
        throw new Error(`Город ${city} не поддерживается`);
    }
    return calculatePriceForCity(city, distance, duration);
};

const publishRideEvent = async (eventType, data, correlationId) => {
    const exchangeName = 'ride_events_exchange';

    try {
        await assertExchange(exchangeName, 'fanout');

        const channel = await getChannel();
        const message = { event: eventType, data, timestamp: new Date().toISOString() };

        channel.publish(exchangeName, '', Buffer.from(JSON.stringify(message)), {
            contentType: 'application/json',
            headers: { 'x-correlation-id': correlationId },
        });

        logger.info(`Событие ${eventType} опубликовано`, { correlationId, message });
    } catch (error) {
        logger.error(`Ошибка публикации события ${eventType}: ${error.message}`, { correlationId });
        throw error;
    }
};

const extractDriverIdFromQRCode = (qrCodeData) => {
    return qrCodeData.driverId;
};

export const requestRide = async (passengerId, origin, destination, paymentType, correlationId) => {
    const transaction = await sequelize.transaction();
    let ride = null;
    const [latitude, longitude] = origin.split(',').map(Number);
    try {
        const { city, distance, duration, price } = await getRideInfo(origin, destination, correlationId);
        const isSupported = await validateCitySupported(city);
        if (!isSupported) {
            throw new Error(`Город "${city}" не поддерживается`);
        }
        ride = await Ride.create({
            passengerId,
            origin,
            destination,
            city: city,
            paymentType,
            price: price,
            distance,
            status: 'pending',
        }, { transaction });
        const nearbyDrivers = await findNearbyDrivers(latitude, longitude, 5, 10);

        if (nearbyDrivers.length === 0) {
            throw new Error('Нет доступных водителей поблизости');
        }

        await sendRideRequestToGeoService(ride.id, origin, destination, city, correlationId);
        console.log('sendRideRequestToGeoService end')
        await notifyNearbyDrivers(ride.id, nearbyDrivers, correlationId);
        console.log('notifyNearbyDrivers end')
        await transaction.commit();

        logger.info('Запрос на поездку успешно отправлен', { rideId: ride.id, correlationId });

        return ride;
    } catch (error) {
        await transaction.rollback();
        logger.error('Ошибка при создании поездки 1', { error: error.message, correlationId });
        throw error;
    }
};

export const processRideGeoData = async (geoData, correlationId) => {
    const transaction = await sequelize.transaction();
    try {
        const { rideId, originLocation, destinationLocation, distanceData, nearbyDrivers } = geoData;

        const ride = await Ride.findByPk(rideId, { transaction });
        if (!ride) {
            throw new Error(`Поездка с ID ${rideId} не найдена`);
        }

        if (!nearbyDrivers.length) throw new Error('Нет доступных водителей рядом');

        const distanceKm = distanceData.distance / 1000;
        const price = await ensureCitySupportedAndGetPrice(ride.city, distanceKm);

        ride.distance = distanceKm;
        ride.price = price;
        ride.driverId = nearbyDrivers[0].member;

        if (ride.paymentType === 'cash') {
            ride.status = 'in_progress';
        } else {
            ride.status = 'driver_assigned';
        }

        await ride.save({ transaction });

        if (ride.paymentType === 'card') {
            await initiatePayment(ride, correlationId);
        }

        await publishRideEvent('ride_started', { rideId: ride.id, driverId: ride.driverId, status: ride.status }, correlationId);

        await transaction.commit();
        logger.info('Поездка обновлена с гео-данными и водителем', { rideId: ride.id, correlationId });
    } catch (error) {
        await transaction.rollback();
        logger.error('Ошибка при обработке гео-данных поездки', { error: error.message, correlationId });
    }
};

export const createRideWithoutPassenger = async (driverId, origin, destination, correlationId) => {
    const transaction = await sequelize.transaction();
    try {
        const { city, distance, duration, price } = await getRideInfo(origin, destination, correlationId);
        const isSupported = await validateCitySupported(city);
        if (!isSupported) {
            throw new Error(`Город "${city}" не поддерживается`);
        }

        const ride = await Ride.create({
            driverId,
            origin,
            destination,
            city,
            distance,
            duration,
            price,
            paymentType: 'cash',
            status: 'in_progress',
        }, { transaction });

        await transaction.commit();
        logger.info('Поездка успешно создана без пассажира', { rideId: ride.id, correlationId });
        return ride;
    } catch (error) {
        await transaction.rollback();
        logger.error('Ошибка при создании поездки без пассажира', { error: error.message, correlationId });
        throw error;
    }
};


export const startRideByQR = async (passengerId, qrCodeData, destination, paymentType, correlationId) => {
    const transaction = await sequelize.transaction();
    let ride = null;
    try {
        const driverId = extractDriverIdFromQRCode(qrCodeData);

        const city = 'Указать город';
        const supported = await validateCitySupported(city);
        if (!supported) {
            throw new Error(`Город ${city} не поддерживается`);
        }

        ride = await Ride.create({
            passengerId,
            driverId,
            origin: 'Текущее местоположение пассажира',
            destination,
            city,
            paymentType,
            status: 'in_progress',
        }, { transaction });

        if (paymentType === 'card') {
            await initiatePayment(ride, correlationId);
        }

        await transaction.commit();

        logger.info('Поездка успешно начата после сканирования QR-кода', { rideId: ride.id, correlationId });

        return ride;
    } catch (error) {
        await transaction.rollback();
        logger.error('Ошибка при создании поездки через QR-код', { error: error.message, correlationId });
        throw error;
    }
};

export const updateRideStatus = async (rideId, status, userId, userRole, correlationId) => {
    const transaction = await sequelize.transaction();
    try {
        const ride = await Ride.findByPk(rideId, { transaction });
        if (!ride) {
            throw new Error(`Поездка с ID ${rideId} не найдена`);
        }

        if (userRole === 'driver' && ride.driverId !== userId) {
            throw new Error('Вы не можете обновить статус этой поездки');
        }
        if (userRole === 'passenger' && ride.passengerId !== userId) {
            throw new Error('Вы не можете обновить статус этой поездки');
        }

        const allowedTransitions = {
            pending: ['in_progress','cancelled'],
            driver_assigned: ['in_progress','cancelled'],
            in_progress: ['completed','cancelled'],
            completed: [],
            cancelled: []
        };

        if (!allowedTransitions[ride.status].includes(status)) {
            throw new Error(`Нельзя сменить статус с ${ride.status} на ${status}`);
        }

        ride.status = status;
        await ride.save({ transaction });

        emitRideUpdate(rideId, { status });

        await publishRideEvent('ride_status_updated', { rideId: ride.id, status }, correlationId);

        await transaction.commit();

        logger.info('Статус поездки обновлен', { rideId: ride.id, status, correlationId });

        return ride;
    } catch (error) {
        await transaction.rollback();
        logger.error('Ошибка при обновлении статуса поездки', { error: error.message, correlationId });
        throw error;
    }
};

export const getRideInfo = async (origin, destination, correlationId) => {
    try {
        const distanceData = await getDistanceAndDurationFromGeoService(origin, destination, correlationId);
        if (!distanceData || !distanceData.distance || !distanceData.duration) {
            throw new Error('Данные о расстоянии и времени отсутствуют');
        }

        const city = await getCityFromCoordinates(origin, correlationId);
        const distanceInKm = distanceData.distance / 1000;
        const durationInMinutes = Math.ceil(distanceData.duration / 60);

        const price = await calculatePriceForCity(city, distanceInKm, durationInMinutes);

        return { city, distance: distanceInKm, duration: durationInMinutes, price };
    } catch (error) {
        logger.error('Ошибка при получении информации о поездке', { error: error.message, correlationId });
        throw new Error('Не удалось получить информацию о поездке');
    }
};


export const activateParkingMode = async (driverId, latitude, longitude, correlationId) => {
    try {
        if (!driverId || !latitude || !longitude) {
            throw new Error('Обязательные параметры не переданы');
        }

        const driver = await Driver.findByPk(driverId);

        if (!driver) {
            throw new Error('Водитель не найден');
        }

        driver.isParkingMode = true;
        await driver.save();

        await addParkedDriverLocation(driverId, latitude, longitude);

        emitParkingStatus(driverId, { latitude: parseFloat(latitude), longitude: parseFloat(longitude) });

        logger.info('Режим парковки активирован', { driverId, correlationId });
        return driver;
    } catch (error) {
        logger.error('Ошибка активации режима парковки', { error: error.message, correlationId });
        throw error;
    }
};

export const deactivateParkingMode = async (driverId, correlationId) => {
    try {
        const driver = await Driver.findByPk(driverId);
        if (!driver) throw new Error('Водитель не найден');

        driver.isParking = false;
        await driver.save();

        await removeParkedDriverLocation(driverId);
        emitParkingStatus(driverId, null);

        logger.info('Режим парковки деактивирован', { driverId, correlationId });
        return driver;
    } catch (error) {
        logger.error('Ошибка деактивации режима парковки', { error: error.message, correlationId });
        throw error;
    }
};

export const acceptRide = async (rideId, driverId, correlationId) => {
    const transaction = await sequelize.transaction();
    try {
        const ride = await Ride.findByPk(rideId, { transaction });

        if (!ride) {
            throw new Error(`Поездка с ID ${rideId} не найдена`);
        }

        if (ride.status !== 'pending') {
            throw new Error(`Поездка недоступна для принятия`);
        }
        ride.driverId = driverId;
        ride.status = 'driver_assigned';
        await ride.save({ transaction });

        await publishRideEvent('ride_accepted', { rideId: ride.id, driverId }, correlationId);

        emitRideUpdate(rideId, { status: 'driver_assigned', driverId, message: 'Водитель принял вашу заявку' });
        emitToDriver(driverId, { event: 'ride_assigned', data: { rideId, status: 'driver_assigned' }});

        emitToPassenger(ride.passengerId, { event: 'ride_accepted', data: { rideId, driverId, message: 'Ваша поездка принята водителем' }});

        await cancelRideNotifications(rideId);
        await transaction.commit();

        logger.info('Поездка успешно принята водителем', { rideId, driverId, correlationId });
        return ride;
    } catch (error) {
        await transaction.rollback();
        logger.error('Ошибка при принятии поездки водителем', { error: error.message, correlationId });
        throw error;
    }
};

export const startRide = async (rideId, driverId, correlationId) => {
    const transaction = await sequelize.transaction();
    try {
        const ride = await Ride.findByPk(rideId, { transaction });

        if (!ride) {
            throw new Error(`Поездка с ID ${rideId} не найдена`);
        }

        if (ride.status !== 'driver_assigned') {
            throw new Error(`Поездка с ID ${rideId} не готова для начала`);
        }

        if (ride.driverId !== driverId) {
            throw new Error('Вы не являетесь назначенным водителем для этой поездки');
        }

        ride.status = 'in_progress';
        await ride.save({ transaction });

        emitRideUpdate(rideId, {
            status: 'in_progress',
            message: 'Поездка началась',
        });

        await publishRideEvent('ride_started', { rideId, status: 'in_progress' }, correlationId);

        await transaction.commit();

        logger.info('Поездка началась', { rideId, driverId, correlationId });
        return ride;
    } catch (error) {
        await transaction.rollback();
        logger.error('Ошибка при начале поездки', { error: error.message, correlationId });
        throw error;
    }
};


export const completeRide = async (rideId, driverId, correlationId) => {
    const transaction = await sequelize.transaction();

    try {
        const ride = await Ride.findByPk(rideId, { transaction });

        if (!ride) {
            throw new Error(`Поездка с ID ${rideId} не найдена`);
        }

        if (ride.driverId !== driverId) {
            throw new Error('Вы не можете завершить эту поездку');
        }

        if (ride.status !== 'in_progress') {
            throw new Error(`Поездка должна быть в статусе "in_progress" для завершения`);
        }

        ride.status = 'completed';
        ride.completedAt = new Date();
        await ride.save({ transaction });

        await publishRideEvent(
            'ride_completed',
            { rideId: ride.id, driverId, status: ride.status },
            correlationId
        );

        emitRideUpdate(rideId, {
            status: 'completed',
            message: 'Поездка завершена',
        });

        await transaction.commit();

        logger.info('Поездка завершена', { rideId, driverId, correlationId });

        return ride;
    } catch (error) {
        await transaction.rollback();
        logger.error('Ошибка при завершении поездки', { error: error.message, correlationId });
        throw error;
    }
};

export const cancelRideByPassenger = async (rideId, passengerId, cancellationReason, correlationId) => {
    const transaction = await sequelize.transaction();
    try {
        const ride = await Ride.findByPk(rideId, { transaction });

        if (!ride) {
            throw new Error(`Поездка с ID ${rideId} не найдена`);
        }

        if (ride.passengerId !== passengerId) {
            throw new Error('Вы не можете отменить эту поездку');
        }

        if (ride.status === 'cancelled' || ride.status === 'completed') {
            throw new Error('Поездка уже завершена или отменена');
        }

        ride.status = 'cancelled';
        ride.cancellationReason = cancellationReason;
        await ride.save({ transaction });

        if (ride.driverId) {
            emitRideUpdate(ride.id, {
                status: 'cancelled',
                cancellationReason,
            });
        } else {
            await cancelRideNotifications(ride.id);
        }

        await transaction.commit();

        logger.info('Поездка отменена пассажиром', { rideId: ride.id, cancellationReason, correlationId });
        return ride;
    } catch (error) {
        await transaction.rollback();
        logger.error('Ошибка при отмене поездки пассажиром', { error: error.message, correlationId });
        throw error;
    }
};

export const activateDriverLine = async (driverId, latitude, longitude) => {
    try {
        const data = await updateDriverLocation(driverId, latitude, longitude);
        console.log({ data})

        emitRideUpdate(driverId, { status: 'on_line', latitude, longitude });

        logger.info('Водитель активировал линию', { driverId, latitude, longitude });
    } catch (error) {
        logger.error('Ошибка при активации линии', { error: error.message, driverId });
        throw new Error('Не удалось активировать линию');
    }
};

export const deactivateDriverLine = async (driverId) => {
    try {
        await removeDriverLocation(driverId);

        emitRideUpdate(driverId, { status: 'off_line' });

        logger.info('Водитель деактивировал линию', { driverId });
    } catch (error) {
        logger.error('Ошибка при деактивации линии', { error: error.message, driverId });
        throw new Error('Не удалось деактивировать линию');
    }
};