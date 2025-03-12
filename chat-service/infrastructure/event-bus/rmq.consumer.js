import amqp from "amqplib";

export class RabbitMQConsumer {
    constructor(config) {
        this.config = config;
        this.connection = null;
        this.channel = null;
    }

    async connect() {
        this.connection = await amqp.connect(this.config.url);
        this.channel = await this.connection.createChannel();
        await this.channel.assertExchange('rides', 'topic', { durable: true });
    }

    async subscribe(eventType, handler) {
        const queue = await this.channel.assertQueue('', { exclusive: true });
        await this.channel.bindQueue(queue.queue, 'rides', eventType);

        this.channel.consume(queue.queue, async (msg) => {
            const event = JSON.parse(msg.content.toString());
            await handler(event);
            this.channel.ack(msg);
        });
    }
}