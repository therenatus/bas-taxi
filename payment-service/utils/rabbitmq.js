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
        logger.error('Ошибка подключения к RabbitMQ:', error);
    }
};

export const getChannel = async () => {
    if (!channel) {
        await connectRabbitMQ();
    }
    return channel;
};
