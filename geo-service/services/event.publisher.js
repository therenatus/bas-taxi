import { getChannel } from '../utils/rabbitmq.js';
import crypto from 'node:crypto';
import logger from '../utils/logger.js';

const uuidv4 = crypto.randomUUID();

export const publishGeoEvent = async (event, data) => {
    const channel = await getChannel();
    const exchangeName = 'geo_events';
    await channel.assertExchange(exchangeName, 'fanout', { durable: true });

    const messageId = uuidv4();
    const message = { event, data };

    channel.publish(exchangeName, '', Buffer.from(JSON.stringify(message)), {
        messageId,
        contentType: 'application/json',
    });

    logger.info('Событие гео опубликовано', { event, messageId });
};
