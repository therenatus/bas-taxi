import express from 'express';
import dotenv from './utils/config.js';
import logger from './utils/logger.js';
import sequelize, {connectDB} from './utils/database.js';
import reviewCommandRoutes from './commands/routes/review.route.js';
import reviewQueryRoutes from './queries/routes/review-query.route.js';
import errorHandler from './middlewares/error.js';
import {connectRabbitMQ} from "./utils/rabbitmg.js";

const app = express();
const PORT = process.env.PORT || 3003;

app.use(express.json());

app.use('/commands/reviews', reviewCommandRoutes);

app.use('/queries/reviews', reviewQueryRoutes);

app.use(errorHandler);

const startServer = async () => {
    try {
        await connectRabbitMQ();
        logger.info('ReviewService: Подключение к RabbitMQ успешно');

        await connectDB();
        await sequelize.sync();
        logger.info('База данных успешно синхронизирована');

        app.listen(PORT, () => {
            logger.info(`Review-Service запущен на порту ${PORT}`);
        });
    }catch(error) {
        logger.error('Ошибка при запуске сервера:', { error: error.message });
        process.exit(1);
    }
};

startServer();

export default app;
