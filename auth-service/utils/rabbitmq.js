import amqp from "amqplib";
import dotenv from "dotenv";
import Driver from "../models/driver.model.js";
import logger from "./logger.js";

dotenv.config();

let channel;

const handleDriverApproval = async (msg) => {
  if (msg.content) {
    const message = JSON.parse(msg.content.toString());
    logger.info("Получено сообщение об одобрении водителя", message);
    try {
      const driver = await Driver.findByPk(message.driverId);
      if (driver) {
        driver.isApproved = true;
        await driver.save();
        logger.info("Водитель одобрен", { driverId: driver.id });
      }
    } catch (error) {
      logger.error("Ошибка при одобрении водителя через RabbitMQ", {
        error: error.message,
      });
    }
  }
};

const handleDriverRejection = async (msg) => {
  if (msg.content) {
    const message = JSON.parse(msg.content.toString());
    logger.info("Получено сообщение об отклонении водителя", message);
    try {
      const driver = await Driver.findByPk(message.driverId);
      if (driver) {
        driver.isApproved = false;
        await driver.save();
        logger.info("Водитель отклонён", { driverId: driver.id });
      }
    } catch (error) {
      logger.error("Ошибка при отклонении водителя через RabbitMQ", {
        error: error.message,
      });
    }
  }
};

export const sendVerificationCode = async (phoneNumber, verificationCode) => {
  try {
    const exchange = "sms_send_exchange";
    const message = { phoneNumber, verificationCode };
    await sendToExchange(exchange, message);
    logger.info("Код верификации отправлен в RabbitMQ", message);
  } catch (error) {
    logger.error("Ошибка отправки кода верификации в RabbitMQ:", error.message);
    throw new Error("Не удалось отправить SMS");
  }
};

export const sendDriverToExchange = async (driverData) => {
  try {
    const exchange = "driver_verification";
    await sendToExchange(exchange, driverData);
    logger.info("Данные водителя отправлены в RabbitMQ", driverData);
  } catch (error) {
    logger.error("Ошибка отправки данных водителя в RabbitMQ:", error.message);
    throw error;
  }
};

export const sendUserToExchange = async (userData) => {
  try {
    const exchange = "user_events";
    await sendToExchange(exchange, userData);
    logger.info("Данные пользователя отправлены в RabbitMQ", userData);
  } catch (error) {
    logger.error(
      "Ошибка отправки данных пользователя в RabbitMQ:",
      error.message
    );
    throw error;
  }
};

const sendToExchange = async (exchange, message) => {
  try {
    if (!channel) {
      await connectRabbitMQ();
    }
    await channel.assertExchange(exchange, "fanout", { durable: true });
    channel.publish(exchange, "", Buffer.from(JSON.stringify(message)), {
      persistent: true,
    });
    logger.info(`Сообщение отправлено в обмен ${exchange}:`, message);
  } catch (error) {
    logger.error(
      `Ошибка отправки сообщения в обмен ${exchange}:`,
      error.message
    );
    throw error;
  }
};

const sendToQueue = async (queue, message) => {
  try {
    if (!channel) {
      await connectRabbitMQ();
    }
    await channel.assertQueue(queue, { durable: true });
    channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), {
      persistent: true,
    });
    logger.info(`Сообщение отправлено в очередь ${queue}:`, message);
  } catch (error) {
    logger.error("Ошибка при отправке сообщения в очередь", {
      error: error.message,
    });
    throw error;
  }
};

const subscribeToExchange = async (exchange, queueName, handler) => {
  try {
    await channel.assertExchange(exchange, "fanout", { durable: true });
    const { queue } = await channel.assertQueue(queueName, { exclusive: true });
    await channel.bindQueue(queue, exchange, "");
    channel.consume(queue, handler, { noAck: true });
    logger.info(`Подписка на обмен ${exchange} через очередь ${queueName}`);
  } catch (error) {
    logger.error(`Ошибка подписки на обмен ${exchange}:`, error.message);
    throw error;
  }
};

export const connectRabbitMQ = async () => {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL);
    channel = await connection.createChannel();
    logger.info("Успешное подключение к RabbitMQ");

    await subscribeToExchange(
      "driver_approval",
      "approvalQueue",
      handleDriverApproval
    );
    await subscribeToExchange(
      "driver_rejection",
      "rejectionQueue",
      handleDriverRejection
    );

    // const approvalQueue = await assertQueueAndBind('driver_approval', 'approvalQueue');
    // channel.consume(approvalQueue, handleDriverApproval, { noAck: true });
    //
    // const rejectionQueue = await assertQueueAndBind('driver_rejection', 'rejectionQueue');
    // channel.consume(rejectionQueue, handleDriverRejection, { noAck: true });
  } catch (error) {
    logger.error("Ошибка подключения к RabbitMQ:", error);
    throw error;
  }
};

export const getChannel = async () => {
  if (!channel) {
    await connectRabbitMQ();
  }
  return channel;
};

export const publishEvent = async (
  exchange,
  routingKey,
  data,
  options = {}
) => {
  try {
    if (!channel) {
      await connectRabbitMQ();
    }

    const exchangeType = options.exchangeType || "topic";

    await channel.assertExchange(exchange, exchangeType, { durable: true });

    const messageOptions = {
      persistent: true,
      timestamp: Date.now(),
      contentType: "application/json",
      ...options,
    };

    channel.publish(
      exchange,
      routingKey,
      Buffer.from(JSON.stringify(data)),
      messageOptions
    );

    logger.info("Событие опубликовано в RabbitMQ", {
      exchange,
      routingKey,
      data: typeof data === "object" ? JSON.stringify(data) : data,
    });
  } catch (error) {
    logger.error("Ошибка при публикации события в RabbitMQ", {
      error: error.message,
      exchange,
      routingKey,
    });
    throw error;
  }
};
