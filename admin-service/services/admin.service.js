import { getChannel } from '../utils/rabbitmq.js';
import logger from '../utils/logger.js';

export const updateSettingsInService = async (settings) => {
    try {
        const channel = await getChannel();
        const exchangeName = 'settings_events';
        await channel.assertExchange(exchangeName, 'fanout', { durable: true });
        const message = {
            event: 'settings_updated',
            data: settings,
        };
        channel.publish(exchangeName, '', Buffer.from(JSON.stringify(message)));
        logger.info('Настройки опубликованы через RabbitMQ', message);
    } catch (error) {
        logger.error('Ошибка при публикации настроек в RabbitMQ', { error: error.message });
        throw error;
    }
};

