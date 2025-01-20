import amqp from 'amqplib';
import logger from './logger.js';
import ReviewView from '../models/review.model.js';

let channel;

const handleDriverApproval = async (msg) => {
    if (msg.content) {
        const message = JSON.parse(msg.content.toString());
        logger.info('Получено сообщение об одобрении водителя в ReviewService', message);

        try {
            const { driverId } = message;

            const existingReview = await ReviewView.findByPk(driverId);

            if (!existingReview) {
                await ReviewView.create({
                    driverId,
                    averageRating: 0,
                    reviewCount: 0,
                });

                logger.info('Создана запись в таблице ReviewView', { driverId });
            } else {
                logger.info('Запись в таблице ReviewView уже существует', { driverId });
            }
        } catch (error) {
            logger.error('Ошибка при создании записи в таблице ReviewView через RabbitMQ', { error: error.message });
        }
    }
};

export const connectRabbitMQ = async () => {
    try {
        const connection = await amqp.connect(process.env.RABBITMQ_URL);
        channel = await connection.createChannel();
        logger.info('ReviewService: Успешное подключение к RabbitMQ');

        const exchange = 'driver_approval';
        await channel.assertExchange(exchange, 'fanout', { durable: true });

        const { queue } = await channel.assertQueue('', { exclusive: true });
        await channel.bindQueue(queue, exchange, '');

        channel.consume(queue, handleDriverApproval, { noAck: true });

        logger.info(`ReviewService: Подписка на обмен ${exchange}`);
    } catch (error) {
        logger.error('ReviewService: Ошибка подключения к RabbitMQ:', error);
        throw error;
    }
};
