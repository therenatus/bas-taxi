import amqp from 'amqplib';
import logger from './logger.js';

let channel;

export const getChannel = async () => {
    if (channel) {
        return channel;
    }

    try {
        const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://rabbitmq');
        channel = await connection.createChannel();
        logger.info('Connected to RabbitMQ');
        return channel;
    } catch (error) {
        logger.error('Failed to connect to RabbitMQ', { error: error.message });
        throw error;
    }
};
