import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import routes from './routes/route.js';
import logger from './utils/logger.js';
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID', 'x-correlation-id', 'x-admin-id'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

app.options('*', cors(corsOptions));

app.use('/', routes);


app.use(express.json());

const morganStream = {
    write: (message) => {
        logger.info(message.trim());
    },
};
app.use(morgan('combined', { stream: morganStream }));

app.use((req, res, next) => {
    const correlationId = req.headers['x-correlation-id'] || `req-${Date.now()}`;
    req.correlationId = correlationId;
    logger.info(`API Gateway: ${req.method} ${req.url} | CorrelationID: ${correlationId}`);
    res.setHeader('x-correlation-id', correlationId);
    next();
});

app.use((err, req, res, next) => {
    logger.error(`Ошибка: ${err.message}`, { correlationId: req.correlationId, stack: err.stack });
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

app.listen(PORT, () => {
    logger.info(`API Gateway запущен на порту ${PORT}`);
});