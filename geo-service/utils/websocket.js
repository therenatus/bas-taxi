import { Server } from 'socket.io';
import logger from '../utils/logger.js';
import config from '../utils/config.js';
import redis from 'redis';

const createWebSocketService = (server) => {
    const io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    const redisClient = redis.createClient({
        socket: {
            host: config.redis.host,
            port: config.redis.port
        }
    });

    redisClient.on('error', (err) => logger.error('Redis Client Error', err));

    const connectRedis = async () => {
        try {
            await redisClient.connect();
            logger.info('Redis подключен');
        } catch (error) {
            logger.error('Ошибка подключения к Redis:', error.message);
            setTimeout(connectRedis, 5000);
        }
    };

    connectRedis();

    io.on('connection', (socket) => {
        logger.info(`Новое подключение: ${socket.id}`);

        socket.on('join_driver', (driverId) => {
            socket.join(`driver_${driverId}`);
            logger.info(`Сокет ${socket.id} присоединился к комнате driver_${driverId}`);
        });

        socket.on('disconnect', () => {
            logger.info(`Отключение сокета: ${socket.id}`);
        });
    });

    const emitLocationUpdate = (driverId, location) => {
        io.to(`driver_${driverId}`).emit('location_update', location);
        logger.info(`Обновление местоположения отправлено в комнату driver_${driverId}`);
    };

    return {
        emitLocationUpdate
    };
};

export default createWebSocketService;
