// файл: infrastructure/clients/RabbitMQPublisher.js
import amqp from "amqplib";

export class RabbitMQProducer {
    constructor(config) {
        this.config = config;
        this.connection = null;
        this.channel = null;
        // Здесь мы используем exchange 'rides', как в вашем старом коде.
        this.exchange = config.exchange || 'rides';
    }

    async connect() {
        this.connection = await amqp.connect(this.config.url);
        this.channel = await this.connection.createChannel();
        // Объявляем exchange с типом 'topic' и durable:true
        await this.channel.assertExchange(this.exchange, 'topic', { durable: true });
        console.log(`RabbitMQPublisher: Подключение установлено, exchange "${this.exchange}" создан.`);
    }

    async publish(eventType, payload) {
        if (!this.channel) {
            throw new Error("RabbitMQPublisher: Канал не установлен. Вызовите connect() перед публикацией.");
        }
        const messageBuffer = Buffer.from(JSON.stringify(payload));
        // Используем eventType как routing key для обмена
        this.channel.publish(this.exchange, eventType, messageBuffer, { persistent: true });
        console.log(`RabbitMQPublisher: Опубликовано событие "${eventType}" с данными:`, payload);
    }

    async close() {
        if (this.channel) {
            await this.channel.close();
        }
        if (this.connection) {
            await this.connection.close();
        }
        console.log("RabbitMQPublisher: Соединение закрыто.");
    }
}
