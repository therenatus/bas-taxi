// src/services/ride.service.js
import axios from "axios";
import Ride from '../models/ride.model.js';
import logger from '../utils/logger.js';
import { assertExchange, getChannel } from '../utils/rabbitmq.js';
import sequelize from '../utils/sequelize.js';
import {
    getCityFromCoordinates,
    getDistanceAndDurationFromGeoService,
    reverseGeocode,
    sendRideRequestToGeoService
} from './geo.service.js';
import {
    addParkedDriverLocation,
    findNearbyDrivers,
    removeDriverLocation,
    removeParkedDriverLocation,
    updateDriverLocation
} from "./location.serrvice.js";
import { cancelRideNotifications } from "./notification.service.js";
import { initiatePayment } from './payment.service.js';
import { calculatePriceForCity, validateCitySupported } from './tariff.service.js';
import { emitParkingStatus, emitRideUpdate, emitToDriver, emitToPassenger } from './websoket.service.js';


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


export const requestRide = async (passengerId, origin, destination, paymentType, correlationId) => {
    const [latitude, longitude] = origin.split(',').map(Number);
    if (isNaN(latitude) || isNaN(longitude)) {
        throw new Error('Некорректные координаты отправления');
    }
    try {
        const result = await sequelize.transaction(async (transaction) => {
            const { city, distance, duration, price } = await getRideInfo(origin, destination, correlationId);
            const isSupported = await validateCitySupported(city);
            if (!isSupported) {
                throw new Error(`Город "${city}" не поддерживается`);
            }

            const [originNameRes, destinationNameRes] = await Promise.all([
                reverseGeocode(origin),
                reverseGeocode(destination)
            ]);

            if (!originNameRes || !originNameRes.address) {
                throw new Error('Не удалось определить название места отправления');
            }
            let originName = originNameRes.address.split(',')[0];

            if (!destinationNameRes || !destinationNameRes.address) {
                throw new Error('Не удалось определить название места назначения');
            }
            let destinationName = destinationNameRes.address.split(',')[0];

            const ride = await Ride.create({
                passengerId,
                origin,
                destination,
                city,
                paymentType,
                price,
                duration,
                distance,
                status: 'pending',
                originName,
                destinationName,
                rejectedDrivers: [],
                searchStartTime: Date.now(),
            }, { transaction });

            await sendRideRequestToGeoService(ride.id, origin, destination, city, correlationId);
            
            startDriverSearch(ride.id, latitude, longitude, correlationId);

            logger.info('Запрос на поездку успешно отправлен', { rideId: ride.id, correlationId });
            return ride;
        });

        return result;
    } catch (error) {
        logger.error('Ошибка при создании поездки', { error: error.message, correlationId });
        throw error;
    }
};

const startDriverSearch = async (rideId, latitude, longitude, correlationId) => {
    try {
        const ride = await Ride.findByPk(rideId);
        if (!ride || ride.status !== 'pending') {
            logger.info('Прекращение поиска водителя: поездка не найдена или не в статусе pending', 
                { rideId, status: ride?.status, correlationId });
            return;
        }

        // Убедимся, что searchStartTime существует, иначе используем текущее время
        const searchStartTime = ride.searchStartTime || Date.now();
        const searchDuration = Date.now() - searchStartTime;
        
        if (searchDuration >= 180000) { // 3 минуты истекли
            logger.info('Поиск водителя превысил таймаут в 3 минуты, отмена поездки', 
                { rideId, searchDuration, correlationId });
            
            // Обновляем статус поездки на cancelled
            await ride.update({ 
                status: 'cancelled', 
                cancellationReason: 'Превышено время ожидания поиска водителя' 
            });
            
            // Публикуем событие отмены
            await publishRideEvent('ride_cancelled', {
                rideId,
                reason: 'Не найдено доступных водителей',
                searchDuration
            }, correlationId);
            
            // Уведомляем пассажира
            emitToPassenger(ride.passengerId, {
                event: 'ride_cancelled',
                data: {
                    rideId,
                    reason: 'Не найдено доступных водителей'
                }
            });
            
            return;
        }

        const nearbyDrivers = await findNearbyDrivers(latitude, longitude, 10, 10);
        
        // Подробное логирование для отладки структуры данных
        logger.info('Результат findNearbyDrivers', { 
            rideId, 
            nearbyDrivers: JSON.stringify(nearbyDrivers),
            correlationId 
        });
        
        // Убедимся, что rejectedDrivers существует и является массивом
        const rejectedDrivers = Array.isArray(ride.rejectedDrivers) ? ride.rejectedDrivers : [];
        
        // Отфильтруем водителей, которые уже отклонили поездку
        // Адаптируем код для работы с форматом объектов {driverId, distance, coordinates}
        const filteredDrivers = nearbyDrivers.filter(driver => {
            // Проверяем формат данных
            if (Array.isArray(driver)) {
                // Если это массив [id, distance, coordinates]
                const driverId = Number(driver[0]);
                return !rejectedDrivers.includes(driverId);
            } else if (driver && typeof driver === 'object' && driver.driverId) {
                // Если это объект {driverId, distance, coordinates}
                const driverId = Number(driver.driverId);
                return !rejectedDrivers.includes(driverId);
            }
            return false; // Неизвестный формат, пропускаем
        });
        
        logger.info('Данные о водителях', {
            rideId,
            nearbyDriversCount: nearbyDrivers.length,
            nearbyDriversFormat: typeof nearbyDrivers[0],
            filteredDriversCount: filteredDrivers.length,
            rejectedDriversCount: rejectedDrivers.length,
            rejectedDrivers: JSON.stringify(rejectedDrivers),
            correlationId
        });
        
        if (!filteredDrivers || filteredDrivers.length === 0) {
            logger.info('Не найдено доступных водителей, повторный поиск через 5 секунд', 
                { rideId, correlationId, searchDuration });
                
            setTimeout(() => {
                startDriverSearch(rideId, latitude, longitude, correlationId);
            }, 5000);
            return;
        }

        // Получаем данные ближайшего водителя
        const nextDriverData = filteredDrivers[0];
        
        // Создаем объект nextDriver из nextDriverData в зависимости от формата
        let nextDriver;
        
        if (Array.isArray(nextDriverData)) {
            // Если это массив [id, distance, coordinates]
            nextDriver = {
                driverId: Number(nextDriverData[0]), 
                distance: nextDriverData[1],
                coordinates: nextDriverData[2]
            };
        } else if (typeof nextDriverData === 'object' && nextDriverData.driverId) {
            // Если это объект {driverId, distance, coordinates}
            nextDriver = {
                driverId: Number(nextDriverData.driverId),
                distance: nextDriverData.distance,
                coordinates: nextDriverData.coordinates
            };
        } else {
            logger.error('Некорректный формат данных водителя', {
                rideId,
                nextDriverData: JSON.stringify(nextDriverData),
                correlationId
            });
            
            // Повторяем поиск через 5 секунд
            setTimeout(() => {
                startDriverSearch(rideId, latitude, longitude, correlationId);
            }, 5000);
            return;
        }
        
        logger.info('Подготовленные данные водителя', { 
            rideId, 
            driver: nextDriver,
            correlationId 
        });
        
        await notifyDriver(rideId, nextDriver, correlationId);

        setTimeout(async () => {
            try {
                const updatedRide = await Ride.findByPk(rideId);
                if (updatedRide && updatedRide.status === 'pending') {
                    logger.info('Водитель не ответил в течение 5 секунд, добавляем в список отклонивших', 
                        { rideId, driverId: nextDriver.driverId, correlationId });
                        
                    // Логируем текущее состояние rejected водителей
                    logger.info('Текущий список отклонивших водителей', {
                        rideId,
                        rejectedDrivers: JSON.stringify(updatedRide.rejectedDrivers),
                        correlationId
                    });
                    
                    // Безопасно обновляем массив rejectedDrivers
                    const currentRejected = Array.isArray(updatedRide.rejectedDrivers) 
                        ? updatedRide.rejectedDrivers 
                        : [];
                    
                    // Проверяем, есть ли уже этот водитель в списке
                    if (!currentRejected.includes(nextDriver.driverId)) {
                        // Создаем новый массив с добавленным водителем
                        const newRejectedDrivers = [...currentRejected, nextDriver.driverId];
                        
                        logger.info('Обновленный список отклонивших водителей', {
                            rideId,
                            newRejectedDrivers: JSON.stringify(newRejectedDrivers),
                            correlationId
                        });
                        
                        // Обновляем поле напрямую и сохраняем
                        await Ride.update(
                            { rejectedDrivers: newRejectedDrivers },
                            { where: { id: rideId } }
                        );
                        
                        // Проверяем, сохранились ли данные
                        const checkRide = await Ride.findByPk(rideId);
                        logger.info('Проверка сохранения списка отклонивших', {
                            rideId,
                            savedRejectedDrivers: JSON.stringify(checkRide.rejectedDrivers),
                            correlationId
                        });
                    } else {
                        logger.info('Водитель уже в списке отклонивших', {
                            rideId,
                            driverId: nextDriver.driverId,
                            correlationId
                        });
                    }
                    
                    // Продолжаем поиск водителей
                    startDriverSearch(rideId, latitude, longitude, correlationId);
                }
            } catch (error) {
                logger.error('Ошибка при обработке таймаута ответа водителя', 
                    { error: error.message, stack: error.stack, rideId, driverId: nextDriver.driverId, correlationId });
                
                // Всё равно продолжаем поиск
                startDriverSearch(rideId, latitude, longitude, correlationId);
            }
        }, 5000);

    } catch (error) {
        logger.error('Ошибка в процессе поиска водителей', 
            { error: error.message, stack: error.stack, rideId, correlationId });
    }
};

const notifyDriver = async (rideId, driver, correlationId) => {
    try {
        if (!driver || !driver.driverId) {
            logger.error('Некорректные данные водителя для уведомления', { 
                rideId, 
                driver, 
                correlationId 
            });
            return;
        }

        const driverId = Number(driver.driverId);
        
        const message = {
            event: 'new_ride_request',
            data: { 
                rideId, 
                distance: driver.distance,
                driverId // Добавляем ID водителя в сообщение
            },
            timestamp: new Date().toISOString(),
        };

        // Отправляем уведомление через WebSocket
        emitToDriver(driverId, message);

        const channel = await getChannel();
        const exchangeName = 'driver_notifications_exchange';
        
        await channel.assertExchange(exchangeName, 'fanout');
        channel.publish(exchangeName, '', Buffer.from(JSON.stringify(message)), {
            contentType: 'application/json',
            headers: { 
                'x-correlation-id': correlationId,
                driverId: driverId
            },
        });

        logger.info('Уведомление отправлено водителю', {
            driverId,
            rideId,
            correlationId
        });
    } catch (error) {
        logger.error('Ошибка при отправке уведомления водителю', {
            error: error.message,
            driverId: driver?.driverId || 'unknown',
            rideId,
            correlationId
        });
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
        const price = await ensureCitySupportedAndGetPrice(ride.city, distanceKm, distanceData.duration / 60);

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
    // if (!driverId || !origin || !destination || !correlationId) {
    //     throw new Error('Отсутствуют необходимые параметры для создания поездки без пассажира');
    // }

    const [latitude, longitude] = origin.split(',').map(Number);
    if (isNaN(latitude) || isNaN(longitude)) {
        throw new Error('Некорректные координаты отправления');
    }

    try {
        const ride = await sequelize.transaction(async (transaction) => {
            const { city, distance, duration, price } = await getRideInfo(origin, destination, correlationId);
            const isSupported = await validateCitySupported(city);
            if (!isSupported) {
                throw new Error(`Город "${city}" не поддерживается`);
            }

            const [originNameRes, destinationNameRes] = await Promise.all([
                reverseGeocode(origin),
                reverseGeocode(destination)
            ]);

            if (!originNameRes || !originNameRes.address) {
                throw new Error('Не удалось определить название места отправления');
            }
            const originName = originNameRes.address.split(',')[0];

            if (!destinationNameRes || !destinationNameRes.address) {
                throw new Error('Не удалось определить название места назначения');
            }
            const destinationName = destinationNameRes.address.split(',')[0];

            const rideRecord = await Ride.create({
                driverId,
                origin,
                destination,
                city,
                distance,
                duration,
                price,
                paymentType: 'cash',
                status: 'in_progress',
                originName,
                destinationName,
            }, { transaction });

            logger.info('Поездка успешно создана без пассажира', { rideId: rideRecord.id, correlationId });
            return rideRecord.toJSON();
        });

        return ride;
    } catch (error) {
        logger.error('Ошибка при создании поездки без пассажира', { error: error.message, correlationId });
        throw error;
    }
};

export const startRideByQR = async (passengerId, driverId, origin, destination, paymentType, correlationId) => {
    // if (!passengerId || !driverId || !origin || !destination || !paymentType || !correlationId) {
    //     throw new Error('Отсутствуют необходимые параметры для начала поездки через QR-код');
    // }

    const [latitude, longitude] = origin.split(',').map(Number);
    if (isNaN(latitude) || isNaN(longitude)) {
        throw new Error('Некорректные координаты отправления');
    }

    try {
        const ride = await sequelize.transaction(async (transaction) => {
            const { city, distance, duration, price } = await getRideInfo(origin, destination, correlationId);
            const isSupported = await validateCitySupported(city);
            if (!isSupported) {
                throw new Error(`Город "${city}" не поддерживается`);
            }

            const [originNameRes, destinationNameRes] = await Promise.all([
                reverseGeocode(origin),
                reverseGeocode(destination)
            ]);

            if (!originNameRes || !originNameRes.address) {
                throw new Error('Не удалось определить название места отправления');
            }
            const originName = originNameRes.address.split(',')[0];

            if (!destinationNameRes || !destinationNameRes.address) {
                throw new Error('Не удалось определить название места назначения');
            }
            const destinationName = destinationNameRes.address.split(',')[0];

            const rideRecord = await Ride.create({
                passengerId,
                driverId,
                origin,
                destination,
                city,
                paymentType,
                distance,
                duration,
                price,
                status: 'in_progress',
                originName,
                destinationName,
            }, { transaction });

            if (paymentType === 'card') {
                await initiatePayment(rideRecord, correlationId);
            }

            emitToDriver(driverId, { event: 'ride_start', data: { rideId: rideRecord.id, status: 'in_progress', message: 'Поездка началась' }});

            logger.info('Поездка успешно начата по QR-коду', { rideId: rideRecord.id, correlationId });
            return rideRecord.toJSON();
        });

        return ride;
    } catch (error) {
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
        throw new Error(`Не удалось получить информацию о поездке: ${error.message}`);
    }
};


export const activateParkingMode = async (driverId, latitude, longitude, correlationId) => {
    try {
        if (!driverId || !latitude || !longitude) {
            throw new Error('Обязательные параметры не переданы');
        }

        // const driver = await Driver.findByPk(driverId);
        //
        // if (!driver) {
        //     throw new Error('Водитель не найден');
        // }

        // driver.isParkingMode = true;
        // await driver.save();

        await addParkedDriverLocation(driverId, latitude, longitude);

        emitParkingStatus(driverId, { latitude: parseFloat(latitude), longitude: parseFloat(longitude) });

        logger.info('Режим парковки активирован', { driverId, correlationId });
    } catch (error) {
        logger.error('Ошибка активации режима парковки', { error: error.message, correlationId });
        throw error;
    }
};

export const deactivateParkingMode = async (driverId, correlationId) => {
    try {
        // const driver = await Driver.findByPk(driverId);
        // if (!driver) throw new Error('Водитель не найден');
        //
        // driver.isParking = false;
        // await driver.save();

        await removeParkedDriverLocation(driverId);
        emitParkingStatus(driverId, null);

        logger.info('Режим парковки деактивирован', { driverId, correlationId });
    } catch (error) {
        logger.error('Ошибка деактивации режима парковки', { error: error.message, correlationId });
        throw error;
    }
};

export const acceptRide = async (rideId, driverId, correlationId) => {
    const transaction = await sequelize.transaction();
    try {
        // Находим поездку
        const ride = await Ride.findByPk(rideId, { transaction });
        if (!ride) {
            throw new Error(`Поездка с ID ${rideId} не найдена`);
        }
        if (ride.status !== 'pending') {
            throw new Error(`Поездка недоступна для принятия`);
        }
        
        // Проверяем, не находится ли водитель в списке отклонивших
        const rejectedDrivers = Array.isArray(ride.rejectedDrivers) ? ride.rejectedDrivers : [];
        if (rejectedDrivers.includes(Number(driverId))) {
            logger.warn('Попытка принятия поездки водителем из черного списка', {
                rideId,
                driverId,
                correlationId
            });
            throw new Error('Вы не можете принять эту поездку');
        }

        // Получаем тариф для города поездки
        const tariff = await Tariff.findOne({ where: { city: ride.city } });
        if (!tariff) {
            throw new Error(`Тариф для города ${ride.city} не найден`);
        }
        const serviceFeePercentage = tariff.serviceFeePercentage;
        // Вычисляем сумму списания: процент от полной цены поездки
        const amountToDeduct = ride.price * serviceFeePercentage / 100;

        // Запрашиваем баланс водителя через balance‑service
        const balanceServiceUrl = process.env.BALANCE_SERVICE_URL || 'http://localhost:3005';
        const balanceResponse = await axios.get(`${balanceServiceUrl}/balance/${driverId}`);
        const driverBalance = balanceResponse.data.balance;

        // Если средств недостаточно – возвращаем ошибку
        if (driverBalance < amountToDeduct) {
            throw new Error('Недостаточно средств на балансе водителя для принятия поездки');
        }

        // Списываем деньги с баланса водителя через balance‑service
        await axios.post(`${balanceServiceUrl}/balance/deduct`, { driverId, amount: amountToDeduct });

        // Обновляем статус поездки и назначаем водителя
        ride.driverId = driverId;
        ride.status = 'driver_assigned';
        await ride.save({ transaction });

        // Публикуем событие о принятии поездки
        await publishRideEvent('ride_accepted', { 
            rideId: ride.id, 
            driverId,
            status: ride.status 
        }, correlationId);

        // Уведомляем участников поездки
        emitRideUpdate(rideId, { 
            status: ride.status, 
            driverId, 
            message: 'Водитель принял вашу заявку' 
        });

        emitToDriver(driverId, { 
            event: 'ride_assigned', 
            data: { 
                rideId, 
                status: ride.status,
                origin: ride.origin,
                destination: ride.destination,
                price: ride.price,
                originName: ride.originName,
                destinationName: ride.destinationName
            }
        });

        emitToPassenger(ride.passengerId, { 
            event: 'ride_accepted', 
            data: { 
                rideId, 
                driverId, 
                message: 'Ваша поездка принята водителем',
                status: ride.status
            }
        });

        // Отменяем поиск других водителей
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

export const onsiteRide = async (rideId, driverId, correlationId) => {
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

        ride.status = 'on_site';
        await ride.save({ transaction });
        emitRideUpdate(rideId, {
            status: 'on_site',
            message: 'Водитель на месте',
        });
        emitToPassenger(ride.passengerId, { event: 'ride_accepted', data: { rideId, driverId, message: 'Водитель на месте' }});

        await publishRideEvent('on_site', { rideId, status: 'on_site' }, correlationId);

        await transaction.commit();

        logger.info('Водитель на месте', { rideId, driverId, correlationId });
        return ride;
    } catch (error) {
        await transaction.rollback();
        logger.error('Ошибка при начале поездки', { error: error.message, correlationId });
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

        if (ride.status !== 'on_site') {
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


export const getActiveRidesByDriver = async (driverId) => {
    try {
        const activeRides = await Ride.findAll({
            where: {
                driverId: driverId,
                status: ['requested', 'accepted', 'in_progress', 'on_site', 'driver_assigned'] // Список статусов, которые считаются активными
            }
        });
        return activeRides;
    } catch (error) {
        logger.error('Ошибка при получении активных поездок водителя', { error: error.message, driverId });
        return [];
    }
};

export const getDriverDetails = async (driverId, correlationId) => {
    try {
        const authResponse = await axios.get(`${process.env.API_GATEWAY_URL}/auth/driver/data/${driverId}`, {
            headers: {
                'X-Correlation-ID': correlationId,
            },
        });
        if (authResponse.status !== 200 || !authResponse.data) {
            throw new Error('Не удалось получить данные водителя из auth-service');
        }

        const driverData = authResponse.data;

        const reviewResponse = await axios.get(`${process.env.API_GATEWAY_URL}/review/queries/reviews/driver/${driverId}`, {
            headers: {
                'X-Correlation-ID': correlationId,
            },
        });

        if (reviewResponse.status !== 200 || reviewResponse.data === undefined) {
            throw new Error('Не удалось получить рейтинг водителя из review-service');
        }

        const reviewData = reviewResponse.data;

        const combinedData = {
            ...driverData,
            ...reviewData
        };

        logger.info('Данные водителя и рейтинг успешно получены', { driverId, correlationId });

        return combinedData;
    } catch (error) {
        logger.error('Ошибка при получении данных водителя или рейтинга', { error: error.message, driverId, correlationId });
        throw error;
    }
};

export const getRideDetails = async (rideID, correlationId) => {
    try {
        const ride = await Ride.findOne({ where: { id: rideID } });
        if(!ride) {
            return null;
        }
        logger.info('Данные успешно получены', { rideID, correlationId });

        return ride;
    } catch (error) {
        logger.error('Ошибка при получении данных водителя или рейтинга', { error: error.message, rideID, correlationId });
        throw error;
    }
};

export const getUserRides = async (userId, correlationId) => {
    try {
        const rides = await  Ride.findAll({
            where: {
                passengerId: userId,
                status: ['requested', 'accepted', 'in_progress', 'completed', 'cancelled', 'pending']
            }
        });

        logger.info('Данные успешно получены', { userId, correlationId });
        console.log(rides);
        return rides;
    } catch (error) {
        logger.error('Ошибка при получении списка поездок пассажира', { error: error.message, userId });
        return [];
    }
};

export const getDriverRides = async (driverId, correlationId) => {
    try {
        const rides = await  Ride.findAll({
            where: {
                driverId: driverId,
                status: ['requested', 'accepted', 'in_progress']
            }
        });

        logger.info('Данные успешно получены', { driverId, correlationId });

        return rides;
    } catch (error) {
        logger.error('Ошибка при получении списка поездок водителя', { error: error.message, userId });
        return [];
    }
};

export const getAllUserRides = async (userId, userType, correlationId) => {
    console.log('userId', userId);
    console.log('userType', userType);
    console.log('correlationId', correlationId);
    try {
        let rides = [];
        
        if (userType === 'passenger') {
            rides = await Ride.findAll({
                where: { passengerId: userId },
                order: [['createdAt', 'DESC']]
            });
            logger.info('Данные о поездках пассажира успешно получены', { userId, correlationId });
        } else if (userType === 'driver') {
            rides = await Ride.findAll({
                where: { driverId: userId },
                order: [['createdAt', 'DESC']]
            });
            logger.info('Данные о поездках водителя успешно получены', { userId, correlationId });
        }
        
        return rides;
    } catch (error) {
        logger.error('Ошибка при получении списка всех поездок пользователя', { 
            error: error.message, 
            userId, 
            userType, 
            correlationId 
        });
        return [];
    }
};

/**
 * Отменяет поездку в случае, если пассажир не пришел в течение 10 минут с момента прибытия водителя
 * 
 * @param {string|number} rideId - Идентификатор поездки
 * @returns {Object} - Результат операции с сообщением об успешной отмене
 * 
 * @throws {Error} - Если поездка не найдена
 * @throws {Error} - Если поездка не соответствует критериям для отмены (статус не 'driver_arrived' или прошло менее 10 минут)
 */
export const cancelRideIfPassengerNotArrived = async (rideId) => {
    const ride = await Ride.findByPk(rideId);
    if (!ride) {
        throw new Error('Поездка не найдена');
    }

    const currentTime = new Date();
    const arrivalTime = new Date(ride.driverArrivalTime);
    const timeDiff = (currentTime - arrivalTime) / (1000 * 60); // разница в минутах

    if (ride.status === 'driver_arrived' && timeDiff >= 10) {
        ride.status = 'cancelled';
        await ride.save();
        return { message: 'Поездка отменена, так как пассажир не пришел' };
    }

    throw new Error('Поездка не может быть отменена');
};