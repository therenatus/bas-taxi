// import { createClient } from 'redis';
// import logger from './logger.js';
//
// const redisClient = createClient({
//     url: process.env.REDIS_URL
// });
//
// redisClient.on('error', (err) => {
//     logger.error('Ошибка подключения к Redis', { error: err.message });
// });
//
// redisClient.on('connect', () => {
//     logger.info('Подключено к Redis');
// });
//
// const connectRedis = async () => {
//     try {
//         await redisClient.connect();
//         logger.info('Redis успешно подключен');
//     } catch (error) {
//         logger.error('Ошибка подключения к Redis', { error: error.message });
//         setTimeout(connectRedis, 5000);
//     }
// };
//
// connectRedis();
//
// export default redisClient;
