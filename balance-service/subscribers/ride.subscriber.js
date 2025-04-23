import retry from "async-retry";
import { updateDriverBalance } from "../services/balance.service.js";
import logger from "../utils/logger.js";
import { getChannel } from "../utils/rabbitmq.js";

export const subscribeToRideEvents = async () => {
  try {
    const channel = await getChannel();
    const exchangeName = "ride_events";
    await channel.assertExchange(exchangeName, "fanout", { durable: true });

    const q = await channel.assertQueue("", { exclusive: true });
    await channel.bindQueue(q.queue, exchangeName, "");

    channel.consume(
      q.queue,
      async (msg) => {
        if (msg.content) {
          const message = JSON.parse(msg.content.toString());
          const messageId = msg.properties.messageId;
          const correlationId = msg.properties.headers["x-correlation-id"];

          try {
            await retry(
              async () => {
                if (message.event === "ride_completed") {
                  const rideData = {
                    ...message.data,
                    messageId,
                  };
                  await updateDriverBalance(rideData, correlationId);
                }
              },
              {
                retries: 5,
                factor: 2,
                minTimeout: 1000,
                maxTimeout: 8000,
                onRetry: (error, attempt) => {
                  logger.warn(`Попытка ${attempt} обработки события поездки`, {
                    error: error.message,
                    correlationId,
                  });
                },
              }
            );
          } catch (error) {
            logger.error(
              "Не удалось обработать событие поездки после повторных попыток",
              {
                error: error.message,
                correlationId,
              }
            );
          }
        }
      },
      { noAck: true }
    );

    logger.info("Подписка на ride_events установлена");
  } catch (error) {
    logger.error("Ошибка при подписке на ride_events", {
      error: error.message,
    });
  }
};
