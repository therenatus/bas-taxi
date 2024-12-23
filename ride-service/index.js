import express from 'express';
import http from 'http';
import config from './utils/config.js';
import logger from './utils/logger.js';
import { connectRabbitMQ, getChannel } from './utils/rabbitmq.js';
import rideRoute from './routes/ride.route.js';
import client from 'prom-client';
import setupSwagger from './swagger.js';
import {startRideSubscribers, subscribeToDriverApproval} from './services/ride.subscribe.js';
import { subscribeToTariffUpdates } from './services/tariff.service.js';
import { createWebSocketService, isWebSocketRunning } from './services/websoket.service.js';

const startServer = async () => {
    const app = express();
    app.use(express.json());

    // Инициализация RabbitMQ
    try {
        await connectRabbitMQ();
        logger.info('RabbitMQ успешно подключен');
    } catch (error) {
        logger.error('Ошибка подключения к RabbitMQ. Завершаем процесс...', error.message);
        process.exit(1); // Завершаем процесс, если RabbitMQ недоступен
    }

    // Настраиваем WebSocket
    const server = http.createServer(app);
    let websocketService;
    try {
        websocketService = createWebSocketService(server);
        logger.info('WebSocket успешно настроен');
    } catch (error) {
        logger.error('Ошибка настройки WebSocket. Завершаем процесс...', error.message);
        process.exit(1);
    }

    // Настраиваем маршруты
    app.use('/', rideRoute);

    // Статус WebSocket
    app.get('/ws-status', (req, res) => {
        if (isWebSocketRunning()) {
            res.json({ websocket: 'running' });
        } else {
            res.status(503).json({ websocket: 'not running' });
        }
    });

    // Метрики Prometheus
    const collectDefaultMetrics = client.collectDefaultMetrics;
    collectDefaultMetrics({ timeout: 5000 });

    app.get('/metrics', async (req, res) => {
        try {
            res.set('Content-Type', client.register.contentType);
            res.end(await client.register.metrics());
        } catch (error) {
            logger.error('Ошибка при получении метрик', error.message);
            res.status(500).end(error);
        }
    });

    // Swagger
    setupSwagger(app);

    // Healthcheck
    app.get('/health', (req, res) => {
        res.json({ status: 'ok' });
    });

    // Настройка подписчиков
    try {
        await startRideSubscribers(websocketService);
        logger.info('Ride-события успешно настроены');
        await subscribeToTariffUpdates();
        logger.info('Тарифные подписчики успешно настроены');
        await subscribeToDriverApproval();
        logger.info('Driver подписчики успешно настроены');
    } catch (error) {
        logger.error('Ошибка настройки подписчиков. Завершаем процесс...', error.message);
        process.exit(1);
    }

    // Запуск сервера
    const PORT = config.port || 3000;
    server.listen(PORT, () => {
        logger.info(`Сервис запущен на порту ${PORT}`);
    });

    return server;
};

// Запускаем сервер
startServer().catch((error) => {
    logger.error('Фатальная ошибка при запуске сервера', error.message);
    process.exit(1);
});
