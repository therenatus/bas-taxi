import amqp from 'amqplib';
import dotenv from 'dotenv';
import logger from '../utils/logger.js';

dotenv.config();

let channel;

export const connectRabbitMQ = async () => {
    try {
        const connection = await amqp.connect(process.env.RABBITMQ_URL);
        channel = await connection.createChannel();
        logger.info('Успешное подключение к RabbitMQ');

        const sendExchange = 'sms_send_exchange';
        const verificationExchange = 'sms_verification_exchange';

        await channel.assertExchange(sendExchange, 'fanout', { durable: true });
        await channel.assertExchange(verificationExchange, 'fanout', { durable: true });

    } catch (error) {
        logger.error('Ошибка подключения к RabbitMQ:', error);
        setTimeout(() => connectRabbitMQ(), 5000);
    }
};

export const sendSms = async ({ phones, mes }) => {
    if (!channel) {
        await connectRabbitMQ();
    }

    const sendExchange = 'sms_send_exchange';
    const message = { phones, mes, attempt: 1 };
    channel.publish(sendExchange, '', Buffer.from(JSON.stringify(message)), { persistent: true });
    logger.info('SMS отправлено в очередь для отправки');
};

export const sendVerification = async ({ phoneNumber, verificationCode, name }) => {
    if (!channel) {
        await connectRabbitMQ();
    }

    const verificationExchange = 'sms_verification_exchange';
    const message = { phoneNumber, verificationCode, name, attempt: 1 };
    channel.publish(verificationExchange, '', Buffer.from(JSON.stringify(message)), { persistent: true });
    logger.info('Verification Code отправлено в очередь для отправки');
};
