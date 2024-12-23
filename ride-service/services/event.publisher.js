import crypto from "node:crypto";
import { getChannel } from '../utils/rabbitmq.js';
import logger from '../utils/logger.js';

const uuidv4 = crypto.randomUUID();

export const publishRideEvent = async (event, data, correlationId) => {
    const channel = await getChannel();
    const exchangeName = 'ride_events';
    await channel.assertExchange(exchangeName, 'fanout', { durable: true });

    const messageId = uuidv4;
    const message = {
        event,
        data,
    };

    channel.publish(exchangeName, '', Buffer.from(JSON.stringify(message)), {
        messageId,
        contentType: 'application/json',
        headers: {
            'x-correlation-id': correlationId,
        },
    });

    logger.info('Событие поездки опубликовано', { event, messageId, correlationId });
};
