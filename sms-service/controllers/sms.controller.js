import amqp from 'amqplib';
import dotenv from 'dotenv';
import logger from '../utils/logger.js';
import config from '../utils/config.js';

dotenv.config();

export const sendSmsManually = async (req, res) => {
    try {
        const { phones, mes } = req.body;

        if (!phones || !mes) {
            return res.status(400).json({ error: 'Поля phones и mes обязательны' });
        }

        const connection = await amqp.connect(config.rabbitmq.url);
        const channel = await connection.createChannel();
        const sendExchange = 'sms_send_exchange';

        await channel.assertExchange(sendExchange, 'fanout', { durable: true });

        const message = { phones, mes, attempt: 1 };
        channel.publish(sendExchange, '', Buffer.from(JSON.stringify(message)), { persistent: true });
        logger.info('SMS отправлено в очередь для отправки вручную');

        await channel.close();
        await connection.close();

        res.status(200).json({ message: 'SMS отправлено в очередь' });
    } catch (error) {
        logger.error('Ошибка при ручной отправке SMS:', error.message);
        res.status(500).json({ error: 'Ошибка при отправке SMS' });
    }
};

export const sendVerificationCodeManually = async (req, res) => {
    try {
        const { phoneNumber, verificationCode, name } = req.body;

        if (!phoneNumber || !verificationCode || !name) {
            return res.status(400).json({ error: 'Поля phoneNumber, verificationCode и name обязательны' });
        }

        const connection = await amqp.connect(config.rabbitmq.url);
        const channel = await connection.createChannel();
        const verificationExchange = 'sms_verification_exchange';

        await channel.assertExchange(verificationExchange, 'fanout', { durable: true });

        const message = { phoneNumber, verificationCode, name, attempt: 1 };
        channel.publish(verificationExchange, '', Buffer.from(JSON.stringify(message)), { persistent: true });
        logger.info('Verification Code отправлено в очередь для отправки вручную');

        await channel.close();
        await connection.close();

        res.status(200).json({ message: 'Verification Code отправлено в очередь' });
    } catch (error) {
        logger.error('Ошибка при ручной отправке Verification Code:', error.message);
        res.status(500).json({ error: 'Ошибка при отправке Verification Code' });
    }
};
