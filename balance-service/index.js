// index.js
import express from 'express';
import { randomUUID } from 'node:crypto';
import client from 'prom-client';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger.js';
import errorHandler from './middlewares/error.js';
import balanceRoutes from './routes/balance.routes.js';
import { subscribeToAdminEvents } from './subscribers/admin.subscriber.js';
import { subscribeToDriverApproval } from "./subscribers/driver-approval.subscriber.js";
import { subscribeToRideEvents } from './subscribers/ride.subscriber.js';
import sequelize from './utils/database.js';
import logger from './utils/logger.js';

const app = express();

app.use(express.json());

app.use((req, res, next) => {
    req.correlationId = req.headers['x-correlation-id'] || randomUUID();
    res.setHeader('X-Correlation-ID', req.correlationId);
    next();
});

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', service: 'balance-service' });
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/', balanceRoutes);

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
        await subscribeToDriverApproval();
    });
}).catch(error => {
    logger.error('Ошибка подключения к базе данных', { error: error.message });
    process.exit(1);
});

