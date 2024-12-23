// index.js
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import paymentRoutes from './routes/payment.route.js';
import sequelize from './utils/database.js';
import logger from './utils/logger.js';
import { connectRabbitMQ } from './utils/rabbitmq.js';
import { startConsuming } from './services/sagaOrchestrator.js';
import {subscribeToPaymentCommands} from "./subscriber/payment.subscribe.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3003;

app.use(cors());
app.use(express.json());

// Подключение к базе данных
sequelize.authenticate()
    .then(() => {
        logger.info('Успешное подключение к базе данных');
        return sequelize.sync(); // Синхронизация моделей
    })
    .then(() => {
        logger.info('Модели синхронизированы');
    })
    .catch(err => {
        logger.error('Ошибка подключения к базе данных', { error: err.message });
    });

// Подключение к RabbitMQ и запуск Saga Orchestrator
connectRabbitMQ()
    .then(() => {
        startConsuming();
        subscribeToPaymentCommands();
    })
    .catch(err => {
        logger.error('Ошибка при подключении к RabbitMQ', { error: err.message });
    });

// Использование маршрутов
app.use('/', paymentRoutes);

// Глобальная обработка ошибок
app.use((err, req, res, next) => {
    logger.error('Необработанная ошибка', {
        message: err.message,
        stack: err.stack,
    });
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

app.listen(PORT, () => {
    logger.info(`Payment Service запущен на порту ${PORT}`);
});
