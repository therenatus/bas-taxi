import amqp from 'amqplib';
import dotenv from 'dotenv';
import logger from './logger.js';
import DriverRequest from '../models/driver-request.model.js';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

// Константы для RabbitMQ
const EXCHANGE_NAME = 'admin_events';
const EXCHANGE_TYPE = 'topic';

let channel;

export const connectRabbitMQ = async () => {
    try {
        const connection = await amqp.connect(process.env.RABBITMQ_URL);
        channel = await connection.createChannel();
        logger.info('Успешное подключение к RabbitMQ');

        const exchangeName = 'driver_verification';
        await channel.assertExchange(exchangeName, 'fanout', { durable: true });
        await channel.assertExchange(EXCHANGE_NAME, EXCHANGE_TYPE, { durable: true });
        
        const q = await channel.assertQueue('', { exclusive: true });
        await channel.bindQueue(q.queue, exchangeName, '');

        channel.consume(q.queue, async (msg) => {
            if (msg.content) {
                const message = JSON.parse(msg.content.toString());
                logger.info('Получено сообщение о новом водителе', message);
                try {
                    await DriverRequest.create({
                        driverId: message.driverId,
                        phoneNumber: message.phoneNumber,
                        city: message.city,
                        status: 'pending',
                    });
                    logger.info('Заявка водителя сохранена в базе данных', { userId: message.userId });
                } catch (dbError) {
                    logger.error('Ошибка при сохранении заявки водителя', { error: dbError.message });
                }
            }
        }, { noAck: true });

    } catch (error) {
        logger.error('Ошибка подключения к RabbitMQ:', error);
        throw error;
    }
};

export const getChannel = async () => {
    if (!channel) {
        await connectRabbitMQ();
    }
    return channel;
};


export const publishToRabbitMQ = async (routingKey, data, correlationId = null) => {
    try {
        const ch = await getChannel();
        const messageId = uuidv4();
        const messageCorrelationId = correlationId || uuidv4();
        
        const success = await ch.publish(
            EXCHANGE_NAME,
            routingKey,
            Buffer.from(JSON.stringify(data)),
            {
                persistent: true,
                messageId,
                correlationId: messageCorrelationId,
                timestamp: Date.now(),
                contentType: 'application/json'
            }
        );
        
        logger.info('Сообщение опубликовано в RabbitMQ', {
            routingKey,
            messageId,
            correlationId: messageCorrelationId,
            success
        });
        
        return success;
    } catch (error) {
        logger.error('Ошибка при публикации сообщения в RabbitMQ', {
            error: error.message,
            routingKey,
            correlationId
        });
        throw error;
    }
};
