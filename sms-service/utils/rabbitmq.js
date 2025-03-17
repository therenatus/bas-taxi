import amqp from 'amqplib';
import dotenv from 'dotenv';
import smscService from '../services/smsc.service.js';
import logger from '../utils/logger.js';
import config from '../utils/config.js';

dotenv.config();

class RabbitMQService {
    constructor() {
        this.connection = null;
        this.channel = null;
        this.sendExchange = 'sms_send_exchange';
        this.verificationExchange = 'sms_verification_exchange';
        this.successExchange = 'sms_success_exchange';
        this.failureExchange = 'sms_failure_exchange';
        this.retryExchange = 'sms_retry_exchange';
        this.sendQueue = 'sms_send_queue';
        this.verificationQueue = 'sms_verification_queue';
        this.retryQueue = 'sms_retry_queue';
        this.maxRetries = 5;
        this.retryDelay = 60000;
        this.connect();
    }

    async connect() {
        try {
            this.connection = await amqp.connect(config.rabbitmq.url);
            this.channel = await this.connection.createChannel();
            logger.info('Успешное подключение к RabbitMQ');

            await this.channel.assertExchange(this.sendExchange, 'fanout', { durable: true });
            await this.channel.assertExchange(this.verificationExchange, 'fanout', { durable: true });
            await this.channel.assertExchange(this.successExchange, 'fanout', { durable: true });
            await this.channel.assertExchange(this.failureExchange, 'fanout', { durable: true });
            await this.channel.assertExchange(this.retryExchange, 'direct', { durable: true });

            await this.channel.assertQueue(this.sendQueue, { durable: true });
            await this.channel.bindQueue(this.sendQueue, this.sendExchange, '');

            await this.channel.assertQueue(this.verificationQueue, { durable: true });
            await this.channel.bindQueue(this.verificationQueue, this.verificationExchange, '');

            await this.channel.assertQueue(this.retryQueue, {
                durable: true,
                deadLetterExchange: this.sendExchange,
                deadLetterRoutingKey: '',
                messageTtl: this.retryDelay
            });
            await this.channel.bindQueue(this.retryQueue, this.retryExchange, 'sms_retry');

            this.channel.consume(this.sendQueue, async (msg) => {
                if (msg !== null) {
                    const message = JSON.parse(msg.content.toString());
                    logger.info('Получено сообщение для отправки SMS', message);
                    await this.handleSendSms(message);
                    this.channel.ack(msg);
                }
            }, { noAck: false });

            this.channel.consume(this.verificationQueue, async (msg) => {
                if (msg !== null) {
                    const message = JSON.parse(msg.content.toString());
                    logger.info('Получено сообщение для отправки Verification Code', message);
                    await this.handleSendVerificationCode(message);
                    this.channel.ack(msg);
                }
            }, { noAck: false });

            this.channel.consume(this.retryQueue, async (msg) => {
                if (msg !== null) {
                    const message = JSON.parse(msg.content.toString());
                    logger.info('Получено сообщение для повторной отправки SMS', message);
                    await this.handleSendSms(message, true);
                    this.channel.ack(msg);
                }
            }, { noAck: false });

        } catch (error) {
            logger.error('Ошибка подключения к RabbitMQ:', error);
            setTimeout(() => this.connect(), 5000);
        }
    }

    async handleSendSms(message, isRetry = false) {
        const { phones, mes, attempt = 1 } = message;
        try {
            await smscService.sendSms({ phones, mes });
            logger.info(`SMS успешно отправлен на номера: ${phones}`);
            this.channel.publish(this.successExchange, '', Buffer.from(JSON.stringify({ phones, mes })), { persistent: true });
            logger.info('Успешное уведомление отправлено в success_exchange');

        } catch (error) {
            logger.error(`Ошибка при отправке SMS на номера ${phones}:`, error.message);

            if (attempt < this.maxRetries) {
                const retryMessage = { phones, mes, attempt: attempt + 1 };
                this.channel.publish(this.retryExchange, 'sms_retry', Buffer.from(JSON.stringify(retryMessage)), { persistent: true });
                logger.info(`SMS добавлен в очередь повторных попыток (Попытка ${attempt + 1})`);
            } else {
                this.channel.publish(this.failureExchange, '', Buffer.from(JSON.stringify({ phones, mes })), { persistent: true });
                logger.error(`Достигнуто максимальное количество попыток отправки SMS на номера: ${phones}`);
            }
        }
    }

    async handleSendVerificationCode(message) {
        const { phoneNumber, verificationCode, name, attempt = 1 } = message;
        const mes = `Здравствуйте, ${name || ''}! Ваш код подтверждения: ${verificationCode}. Используйте его для завершения регистрации.`;
        try {
            await smscService.sendSms({ phones: phoneNumber, mes });
            logger.info(`Verification Code SMS успешно отправлен на номер: ${phoneNumber}`);
            this.channel.publish(this.successExchange, '', Buffer.from(JSON.stringify({ phones: phoneNumber, mes })), { persistent: true });
            logger.info('Успешное уведомление отправлено в success_exchange');
        } catch (error) {
            logger.error(`Ошибка при отправке Verification Code SMS на номер ${phoneNumber}:`, error.message);

            if (attempt < this.maxRetries) {
                const retryMessage = { phoneNumber, verificationCode, name, attempt: attempt + 1 };
                this.channel.publish(this.retryExchange, 'sms_retry', Buffer.from(JSON.stringify(retryMessage)), { persistent: true });
                logger.info(`Verification Code SMS добавлен в очередь повторных попыток (Попытка ${attempt + 1})`);
            } else {
                this.channel.publish(this.failureExchange, '', Buffer.from(JSON.stringify({ phoneNumber, verificationCode, name })), { persistent: true });
                logger.error(`Достигнуто максимальное количество попыток отправки Verification Code SMS на номер: ${phoneNumber}`);
            }
        }
    }
}

export default new RabbitMQService();
