import amqp from 'amqplib';
import dotenv from 'dotenv';
import logger from './logger.js';

dotenv.config();

let channel;

export const connectRabbitMQ = async () => {
    try {
        const connection = await amqp.connect(process.env.RABBITMQ_URL);
        channel = await connection.createChannel();
        logger.info('Успешно подключились к RabbitMQ');
    } catch (error) {
        logger.error('Ошибка подключения к RabbitMQ:', error.message);
        throw error;
    }
};

export const getChannel = async () => {
    if (!channel) {
        await connectRabbitMQ();
    }
    return channel;
};

export const assertExchange = async (exchangeName, type = 'fanout', options = { durable: true }) => {
    try {
        const channel = await getChannel();
        await channel.assertExchange(exchangeName, type, options);
        logger.info(`Exchange "${exchangeName}" успешно создан или проверен`);
    } catch (error) {
        logger.error(`Ошибка при проверке/создании Exchange "${exchangeName}"`, error.message);
        throw error;
    }
};
