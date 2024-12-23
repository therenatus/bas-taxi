// sms-service/index.js
import express from "express";
import smsRoutes from './routes/sms.route.js';
import config from './utils/config.js';
import logger from './utils/logger.js';

// Импортируем сервис для работы с RabbitMQ
// (предполагается, что он подключается и настраивается при импортировании)
import './utils/rabbitmq.js';

const app = express();

app.use(express.json());

app.use('/', smsRoutes);

// Запуск сервера
app.listen(config.port, () => {
    logger.info(`SMS Service is running on port ${config.port}`);
});
