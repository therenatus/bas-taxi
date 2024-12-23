import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import routes from './routes/route.js';
import morgan from "morgan";
import logger from "./utils/logger.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

app.use('/', routes);

app.use(express.json());
app.use(cors());

const morganStream = {
    write: (message) => {
        console.log(message.trim());
        logger.info(message.trim());
    },
};

app.use(morgan('combined', { stream: morganStream }));

app.use((req, res, next) => {
    logger.info(`API Gateway: Получен запрос ${req.method} ${req.url} CorrelationID: ${req.headers['x-correlation-id'] || 'none'}`);
    next();
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

app.listen(PORT, () => {
    console.log(`API Gateway запущен на порту ${PORT}`);
});
