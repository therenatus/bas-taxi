import { getChannel } from '../utils/rabbitmq.js';
import logger from '../utils/logger.js';
import crypto from "node:crypto";

const uuidv4 = crypto.randomUUID()

export const initiatePayment = async (ride, correlationId) => {
    const channel = await getChannel();
    const exchangeName = 'payment_commands';
    await channel.assertExchange(exchangeName, 'direct', { durable: true });

    const messageId = uuidv4();
    const message = {
        command: 'process_payment',
        data: {
            rideId: ride.id,
            passengerId: ride.passengerId,
            amount: ride.price,
        },
    };

    channel.publish(exchangeName, 'process_payment', Buffer.from(JSON.stringify(message)), {
        messageId,
        contentType: 'application/json',
        headers: {
            'x-correlation-id': correlationId,
        },
    });

    logger.info('Команда на обработку платежа отправлена', { rideId: ride.id, messageId, correlationId });
};

export const cancelPayment = async (rideId, correlationId) => {
    const channel = await getChannel();
    const exchangeName = 'payment_commands';
    await channel.assertExchange(exchangeName, 'direct', { durable: true });

    const messageId = uuidv4();
    const message = {
        command: 'cancel_payment',
        data: {
            rideId,
        },
    };

    channel.publish(exchangeName, 'cancel_payment', Buffer.from(JSON.stringify(message)), {
        messageId,
        contentType: 'application/json',
        headers: {
            'x-correlation-id': correlationId,
        },
    });

    logger.info('Команда на отмену платежа отправлена', { rideId, messageId, correlationId });
};
