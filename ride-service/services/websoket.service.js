import { Server } from 'socket.io';
import logger from '../utils/logger.js';
import { removeDriverLocation, updateDriverLocation } from './location.serrvice.js';
import {getActiveRidesByDriver} from "./ride.service.js";

let ioInstance = null;

let isInitialized = false;

let emitRideUpdate = () => { throw new Error('emitRideUpdate вызван до инициализации WebSocket-сервиса'); };
let emitParkingStatus = () => { throw new Error('emitParkingStatus вызван до инициализации WebSocket-сервиса'); };
let emitToDriver = () => { throw new Error('WebSocket не инициализирован'); };
let emitToPassenger = () => { throw new Error('emitToPassenger вызван до инициализации WebSocket-сервиса'); };

export const createWebSocketService = (server) => {
    const io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
        }
    });

    ioInstance = io;
    isInitialized = true;

    const ridesNamespace = io.of('/rides');

    ridesNamespace.on('connection', (socket) => {
        logger.info(`WebSocket: новое подключение ${socket.id}`);

        socket.emit("test_response", { message: "Привет, клиент!" });

        socket.on('driver_location', async ({ driverId, latitude, longitude }) => {
            try {
                await updateDriverLocation(driverId, latitude, longitude);
                logger.info(`WebSocket: Координаты водителя обновлены [Driver ID: ${driverId}]`);

                const activeRides = await getActiveRidesByDriver(driverId);

                activeRides.forEach(ride => {
                    const rideRoom = `ride_${ride.dataValues.id}`;

                    emitRideUpdate(ride.dataValues.id, {
                        driverId,
                        latitude,
                        longitude
                    });

                    ridesNamespace.to(rideRoom).emit("driver_location_update", {
                        driverId,
                        latitude,
                        longitude
                    });
                });

            } catch (error) {
                logger.error('WebSocket: Ошибка при обновлении координат водителя', { error: error.message });
            }
        });

        socket.on('join_driver', (driverId, callback) => {
            logger.info(`Получено событие 'join_driver' от сокета ${socket.id} с driverId: ${driverId}`);
            socket.join(`driver_${driverId}`);
            socket.driverId = driverId; // Сохраняем driverId в сокете
            logger.info(`WebSocket: Сокет ${socket.id} присоединился к driver_${driverId}`);
            if (callback) callback('join_driver_success');
        });

        socket.on('join_user', (userId, callback) => {
            socket.join(`user_${userId}`);
            logger.info(`WebSocket: Сокет ${socket.id} присоединился к user_${userId}`);
            if (callback) callback('join_user_success');
        });

        socket.on('join_ride', (rideId, callback) => {
            socket.join(`ride_${rideId}`);
            logger.info(`WebSocket: Сокет ${socket.id} присоединился к ride_${rideId}`);
            if (callback) callback('join_ride_success');
        });

        socket.on('driver_parking', async ({ driverId, latitude, longitude }) => {
            try {
                emitParkingStatus(driverId, { latitude, longitude, isParking: true });
                logger.info(`WebSocket: Водитель ${driverId} активировал режим парковки`);
            } catch (error) {
                logger.error('WebSocket: Ошибка при активации режима парковки', { error: error.message });
            }
        });

        socket.on('driver_exit_parking', async (driverId) => {
            try {
                emitParkingStatus(driverId, { isParking: false });
                logger.info(`WebSocket: Водитель ${driverId} вышел из режима парковки`);
            } catch (error) {
                logger.error('WebSocket: Ошибка при выходе из режима парковки', { error: error.message });
            }
        });

        socket.on('disconnect', async () => {
            const driverId = socket.driverId;
            if (driverId) {
                try {
                    await removeDriverLocation(driverId);
                    logger.info(`WebSocket: Местоположение водителя ${driverId} удалено`);
                } catch (error) {
                    logger.error('WebSocket: Ошибка при удалении координат водителя', { error: error.message, driverId });
                }
            }
            logger.info(`WebSocket: Отключение сокета ${socket.id}`);
        });
    });

    emitRideUpdate = (rideId, update) => {
        ridesNamespace.to(`ride_${rideId}`).emit('ride_update', update);
        logger.info(`WebSocket: Обновление отправлено в ride_${rideId}`, update);
    };

    emitParkingStatus = (driverId, parkingInfo) => {
        ridesNamespace.emit('driver_parking_update', parkingInfo);
        logger.info(`WebSocket: Статус парковки водителя обновлён [Driver ID: ${driverId}]`, parkingInfo);
    };

    emitToDriver = (driverId, message) => {
        ridesNamespace.to(`driver_${driverId}`).emit('notification', message);
        logger.info(`WebSocket: Уведомление отправлено водителю [Driver ID: ${driverId}]`, message);
    };

    emitToPassenger = (userId, message) => {
        ridesNamespace.to(`user_${userId}`).emit('notification', message);
        logger.info(`WebSocket: Уведомление отправлено пользователю [User ID: ${userId}]`, message);
    };

    logger.info('WebSocket-сервис инициализирован');

    return { emitRideUpdate, emitParkingStatus, emitToDriver, emitToPassenger };
};

export const isWebSocketRunning = () => {
    logger.info(`Проверка состояния WebSocket: ${isInitialized ? 'running' : 'not running'}`);
    return isInitialized;
};

export { emitRideUpdate, emitParkingStatus, emitToDriver, emitToPassenger };
