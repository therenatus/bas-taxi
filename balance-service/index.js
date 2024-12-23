import express from 'express';
import logger from './utils/logger.js';
import sequelize from './utils/database.js';
import balanceRoutes from './routes/balance.route.js';
import errorHandler from './middlewares/error.js';
import {subscribeToAdminEvents} from './subscribers/admin.subscriber.js';
import {subscribeToRideEvents} from './subscribers/ride.subscriber.js';
import {randomUUID} from 'node:crypto';
import client from 'prom-client';

const uuidv4 = randomUUID();
const app = express();

app.use(express.json());

app.use((req, res, next) => {
    req.correlationId = req.headers['x-correlation-id'] || uuidv4();
    res.setHeader('X-Correlation-ID', req.correlationId);
    next();
});

app.use('/balance', balanceRoutes);

client.collectDefaultMetrics();

app.get('/metrics', async (req, res) => {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
});

app.use(errorHandler);

const PORT = process.env.PORT || 3005;
sequelize.sync().then(() => {
    app.listen(PORT, async () => {
        logger.info(`Balance-Service запущен на порту ${PORT}`);

        await subscribeToAdminEvents();
        await subscribeToRideEvents();
    });
}).catch(error => {
    logger.error('Ошибка подключения к базе данных', { error: error.message });
    process.exit(1);
});

