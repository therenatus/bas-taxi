import { createClient } from 'redis';
import logger from './logger.js';

const redisClient = createClient({
    url: process.env.REDIS_URL,
});

redisClient.on('error', (err) => {
    logger.error('Ошибка подключения к Redis', { error: err.message });
});

redisClient.on('connect', () => {
    logger.info('Подключено к Redis');
});

await redisClient.connect();

export default redisClient;
