// subscribers/admin.subscriber.js
import ProcessedMessage from '../models/processed-message.model.js';
import Tariff from '../models/tariff.model.js';
import logger from '../utils/logger.js';
import { getChannel } from '../utils/rabbitmq.js';

export const subscribeToAdminEvents = async () => {
    try {
        const channel = await getChannel();
        const exchangeName = 'admin_events';
        await channel.assertExchange(exchangeName, 'topic', { durable: true });

        const q = await channel.assertQueue('', { exclusive: true });
        await channel.bindQueue(q.queue, exchangeName, '#');

        channel.consume(q.queue, async (msg) => {
            if (msg.content) {
                const message = JSON.parse(msg.content.toString());
                const messageId = msg.properties.messageId;
                const correlationId = msg.properties.headers?.['x-correlation-id'];

                const alreadyProcessed = await ProcessedMessage.findOne({
                    where: { messageId },
                });
                if (alreadyProcessed) {
                    logger.info(`Сообщение с ID ${messageId} уже обработано`, {
                        correlationId,
                    });
                    return;
                }

                if (message.event === 'tariff_updated') {
                    const { city, commissionPercentage } = message.data;

                    await Tariff.upsert({
                        city,
                        commissionPercentage,
                    });

                    await ProcessedMessage.create({
                        messageId,
                        processedAt: new Date(),
                    });

                    logger.info(`Тариф для города ${city} обновлен`, { correlationId });
                }
            }
        }, { noAck: true });

        logger.info('Подписка на admin_events установлена');
    } catch (error) {
        logger.error('Ошибка при подписке на admin_events', { error: error.message });
    }
};
