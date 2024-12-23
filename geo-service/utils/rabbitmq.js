import amqp from 'amqplib';
import logger from './logger.js';

let channel = null;

export const connectRabbitMQ = async () => {
    try {
        const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://rabbitmq');
        channel = await connection.createChannel();
        logger.info('Подключено к RabbitMQ');
    } catch (error) {
        logger.error('Не удалось подключиться к RabbitMQ', { error: error.message });
        process.exit(1);
    }
};

export const getChannel = () => {
    if (!channel) {
        throw new Error('Канал RabbitMQ не инициализирован');
    }
    return channel;
};
