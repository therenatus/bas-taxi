import {processPayment} from "../services/payment.service.js";
import ProcessedMessage from "../models/processed-message.model.js";
import logger from "../utils/logger.js";
import {getChannel} from "../utils/rabbitmq.js";

const publishPaymentEvent = async (event, data) => {
    const channel = await getChannel();
    const exchangeName = 'payment_saga';
    await channel.assertExchange(exchangeName, 'topic', { durable: true });

    const message = {
        sagaId: data.rideId,
        event,
        data,
    };

    channel.publish(exchangeName, `payment.${event}`, Buffer.from(JSON.stringify(message)));
    logger.info(`Событие ${event} опубликовано`, message);
};

export const subscribeToPaymentCommands = async () => {
    try {
        const channel = await getChannel();
        const exchangeName = 'payment_commands';
        await channel.assertExchange(exchangeName, 'direct', { durable: true });

        const queueName = 'payment_commands_queue';
        const q = await channel.assertQueue(queueName, { durable: true });
        await channel.bindQueue(q.queue, exchangeName, 'process_payment');

        channel.consume(
            q.queue,
            async (msg) => {
                if (msg.content) {
                    const command = JSON.parse(msg.content.toString());
                    const messageId = msg.properties.messageId;

                    const alreadyProcessed = await ProcessedMessage.findOne({ where: { messageId } });
                    if (alreadyProcessed) {
                        logger.info(`Сообщение с messageId ${messageId} уже обработано`);
                        channel.ack(msg);
                        return;
                    }

                    try {
                        await processPayment(command.data);

                        await ProcessedMessage.create({ messageId, processedAt: new Date() });

                        await publishPaymentEvent('success', { rideId: command.data.rideId });
                    } catch (error) {
                        await publishPaymentEvent('failed', { rideId: command.data.rideId });
                    }

                    channel.ack(msg);
                }
            },
            { noAck: false }
        );

        logger.info('Подписка на payment_commands установлена');
    } catch (error) {
        logger.error('Ошибка при подписке на payment_commands', { error: error.message });
    }
};