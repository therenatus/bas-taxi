import { getChannel } from '../utils/rabbitmq.js';
import logger from '../utils/logger.js';
import { processPayment } from './payment.service.js';
import PaymentModel from "../models/payment.model.js";


export const publishPaymentEvent = async (event, data) => {
    try {
        const channel = await getChannel();
        const exchangeName = 'payment_saga';
        await channel.assertExchange(exchangeName, 'topic', { durable: true });

        const message = {
            sagaId: data.rideId,
            event,
            data,
        };

        const routingKey = `payment.${event}`;
        channel.publish(exchangeName, routingKey, Buffer.from(JSON.stringify(message)));
        logger.info(`Событие "${routingKey}" опубликовано`, message);
    } catch (error) {
        logger.error('Ошибка при публикации события платежа', { error: error.message });
        throw error;
    }
};

export const initiatePaymentSaga = async (paymentData) => {
    try {
        // Создание записи о платеже со статусом 'pending'
        await PaymentModel.create({
            rideId: paymentData.rideId,
            passengerId: paymentData.passengerId,
            driverId: paymentData.driverId,
            amount: paymentData.amount,
            paymentMethod: paymentData.paymentMethod,
            status: 'pending',
        });

        logger.info('Создана запись о платеже', { rideId: paymentData.rideId });

        await publishPaymentEvent('RideCompleted', paymentData);

        logger.info('Событие "RideCompleted" опубликовано', paymentData);
    } catch (error) {
        logger.error('Ошибка при инициации Saga', { error: error.message });
        throw error;
    }
};

const handleRideCompleted = async (data) => {
    try {
        logger.info('Обработка события "RideCompleted"', data);

        await processPayment(data);


        await publishPaymentEvent('success', { rideId: data.rideId });

        logger.info('Событие "payment.success" опубликовано', { rideId: data.rideId });
    } catch (error) {
        logger.error('Ошибка при обработке события "RideCompleted"', { error: error.message });

        await publishPaymentEvent('failed', { rideId: data.rideId });

        logger.info('Событие "payment.failed" опубликовано', { rideId: data.rideId });
    }
};

const handlePaymentSuccess = async (data) => {
    try {
        logger.info('Обработка события "payment.success"', data);
    } catch (error) {
        logger.error('Ошибка при обработке события "payment.success"', { error: error.message });
    }
};

const handlePaymentFailed = async (data) => {
    try {
        logger.warn('Обработка события "payment.failed"', data);
    } catch (error) {
        logger.error('Ошибка при обработке события "payment.failed"', { error: error.message });
    }
};


export const startConsuming = async () => {
    try {
        const channel = await getChannel();
        const exchangeName = 'payment_saga';
        await channel.assertExchange(exchangeName, 'topic', { durable: true });

        const queueName = 'payment_saga_orchestrator_queue';
        const q = await channel.assertQueue(queueName, { durable: true });

        await channel.bindQueue(q.queue, exchangeName, 'payment.#');
        logger.info(`Очередь "${q.queue}" привязана к обмену "${exchangeName}" с ключом "payment.#"`);

        channel.consume(
            q.queue,
            async (msg) => {
                if (msg.content) {
                    try {
                        const message = JSON.parse(msg.content.toString());
                        logger.info('Получено сообщение в оркестраторе Saga', message);

                        switch (message.event) {
                            case 'RideCompleted':
                                await handleRideCompleted(message.data);
                                break;
                            case 'payment.success':
                                await handlePaymentSuccess(message.data);
                                break;
                            case 'payment.failed':
                                await handlePaymentFailed(message.data);
                                break;
                            default:
                                logger.warn('Неизвестное событие', { event: message.event });
                        }
                    } catch (error) {
                        logger.error('Ошибка при обработке сообщения в оркестраторе Saga', { error: error.message });
                    }
                }

                channel.ack(msg);
            },
            { noAck: false }
        );

        logger.info('Оркестратор Saga начал прослушивание событий');
    } catch (error) {
        logger.error('Ошибка при запуске оркестратора Saga', { error: error.message });
    }
};
