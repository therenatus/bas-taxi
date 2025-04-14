import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import logger from './utils/logger.js';
import sequelize from './utils/database.js';
import { connectRabbitMQ } from './utils/rabbitmq.js';
import * as client from 'prom-client';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';
import setupSwagger from './utils/swagger.js';

import passengerRoutes from './routes/passanger.route.js';
import driverRoutes from './routes/driver.route.js';
import adminRoutes from './routes/admin.route.js';
import paymentRoutes from './routes/payment.route.js';
import {fileURLToPath} from "url";
import path from "path";

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, './uploads');

app.use(cors());
app.use(express.json());
app.use(morgan('combined', {
    stream: {
        write: (message) => logger.info(message.trim()),
    },
}));


app.use((req, res, next) => {
    req.correlationId = req.headers['x-correlation-id'] || uuidv4();
    res.setHeader('X-Correlation-ID', req.correlationId);
    next();
});

app.use((req, res, next) => {
    console.log(`Получен запрос: ${req.method} ${req.url}`);
    res.on('finish', () => {
        console.log(`Ответ отправлен: ${res.statusCode} ${req.method} ${req.url}`);
    });
    next();
});

const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics();

app.get('/metrics', async (req, res) => {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
});

app.use('/uploads', express.static(uploadsDir));

app.use('/passenger', passengerRoutes);
app.use('/driver', driverRoutes);
app.use('/admin', adminRoutes);
app.use('/payment-details', paymentRoutes);


setupSwagger(app);

app.use((err, req, res, next) => {
    logger.error('Unhandled error occurred', {
        message: err.message,
        stack: err.stack,
        correlationId: req.correlationId,
    });
    res.status(500).json({ error: 'Internal Server Error' });
});

const startServer = async () => {
    try {
        await sequelize.authenticate();
        logger.info('Successfully connected to the database');
        await sequelize.sync({ alter: true });
        logger.info('Database models synchronized');

        await connectRabbitMQ();
        logger.info('Successfully connected to RabbitMQ');

        const PORT = process.env.PORT || 3001;
        app.listen(PORT, () => {
            logger.info(`Auth-Service is running on port ${PORT}`);
        });
    } catch (err) {
        logger.error('Failed to initialize application', {
            error: err.message,
        });
        process.exit(1);
    }
};

startServer();
