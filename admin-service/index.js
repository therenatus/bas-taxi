import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import adminRoutes from './routes/admin.route.js';
import logger from './utils/logger.js';
import { connectRabbitMQ } from './utils/rabbitmq.js';
import morgan from "morgan";
import sequelize from "./utils/database.js";
import setupSwagger from './swaggger.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3008;

app.use(cors());
app.use(express.json());

const morganStream = {
    write: (message) => {
        console.log(message.trim());
        logger.info(message.trim());
    },
};

app.use(morgan('combined', { stream: morganStream }));

app.use((req, res, next) => {
    logger.info(`Admin Service: Получен запрос ${req.method} ${req.url} CorrelationID: ${req.headers['x-correlation-id'] || 'none'}`);
    next();
});

// Сначала настраиваем Swagger, чтобы его маршруты были доступны без авторизации
setupSwagger(app);
app.use('/', adminRoutes);
// Middleware для проверки авторизации для маршрутов API (кроме Swagger)
// app.use((req, res, next) => {
//     // Пропускаем запросы к Swagger
//     if (req.path.startsWith('/api-docs')) {
//         return next();
//     }
//
//     // Для остальных маршрутов применяется авторизация через соответствующие middleware
//     next();
// });

// Подключаем маршруты API после настройки Swagger и авторизации

sequelize.authenticate()
    .then(() => {
        logger.info('Успешное подключение к базе данных');
        return sequelize.sync(); // Синхронизация моделей
    })
    .then(() => {
        logger.info('Модели синхронизированы');
    })
    .catch((err) => {
        logger.error('Ошибка подключения к базе данных', { error: err.message });
    });

connectRabbitMQ()
    .catch(err => {
        logger.error('Ошибка при подключении к RabbitMQ', { error: err.message });
    });

app.use((err, req, res, next) => {
    logger.error('Необработанная ошибка', {
        message: err.message,
        stack: err.stack,
    });
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

app.listen(PORT, () => {
    logger.info(`Admin Service запущен на порту ${PORT}`);
});
