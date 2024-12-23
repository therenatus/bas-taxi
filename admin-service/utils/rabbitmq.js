import amqp from 'amqplib';
import dotenv from 'dotenv';
import logger from './logger.js';
import DriverRequest from '../models/driver-request.model.js';

dotenv.config();

let channel;

export const connectRabbitMQ = async () => {
    try {
        const connection = await amqp.connect(process.env.RABBITMQ_URL);
        channel = await connection.createChannel();
        logger.info('Успешное подключение к RabbitMQ');

        const exchangeName = 'driver_verification';
        await channel.assertExchange(exchangeName, 'fanout', { durable: true });
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
