import express from 'express';
import dotenv from './utils/config.js';
import logger from './utils/logger.js';
import sequelize from './utils/database.js';
import reviewCommandRoutes from './commands/routes/review.route.js';
import reviewQueryRoutes from './queries/routes/review-query.route.js';
import errorHandler from './middlewares/error.js';

const app = express();

app.use(express.json());

app.use('/commands/reviews', reviewCommandRoutes);

app.use('/queries/reviews', reviewQueryRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 3003;
sequelize.sync().then(() => {
    app.listen(PORT, async () => {
        logger.info(`Review-Service запущен на порту ${PORT}`);
    });
}).catch(error => {
    logger.error('Ошибка подключения к базе данных', { error: error.message });
    process.exit(1);
});

export default app;
