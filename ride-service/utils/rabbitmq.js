import amqp from "amqplib";
import dotenv from "dotenv";
import logger from "./logger.js";

dotenv.config();

let channel;

export const connectRabbitMQ = async () => {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL);
    channel = await connection.createChannel();

    await channel.assertExchange("driver_notifications_exchange", "fanout", {
      durable: true,
    });
    await channel.assertExchange("ride_events_exchange", "fanout", {
      durable: true,
    });

    logger.info("Успешно подключились к RabbitMQ и инициализировали обмены");
  } catch (error) {
    logger.error("Ошибка подключения к RabbitMQ:", error.message);
    throw error;
  }
};

export const getChannel = async () => {
  if (!channel) {
    await connectRabbitMQ();
  }
  return channel;
};

export const assertExchange = async (
  exchangeName,
  type = "fanout",
  options = { durable: true }
) => {
  try {
    const channel = await getChannel();
    await channel.assertExchange(exchangeName, type, options);
    logger.info(`Exchange "${exchangeName}" успешно создан или проверен`);
  } catch (error) {
    logger.error(
      `Ошибка при проверке/создании Exchange "${exchangeName}"`,
      error.message
    );
    throw error;
  }
};
