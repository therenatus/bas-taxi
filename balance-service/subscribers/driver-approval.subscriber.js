import DriverBalance from "../models/balance.model.js";
import Transaction from "../models/transaction.model.js";
import logger from "../utils/logger.js";
import { getChannel } from "../utils/rabbitmq.js";

export const subscribeToDriverApproval = async () => {
  try {
    const channel = await getChannel();
    const exchangeName = "driver_approval";
    await channel.assertExchange(exchangeName, "fanout", { durable: true });
    const q = await channel.assertQueue("", { exclusive: true });
    await channel.bindQueue(q.queue, exchangeName, "");

    channel.consume(q.queue, async (msg) => {
      if (msg && msg.content) {
        try {
          const message = JSON.parse(msg.content.toString());
          const { driverId } = message;
          logger.info("Получено событие driver_approval", { driverId });

          const [balance, created] = await DriverBalance.findOrCreate({
            where: { driverId },
            defaults: { balance: 0 },
          });

          if (created) {
            await Transaction.create({
              driverId,
              amount: 0,
              type: "initialization",
              description: "Инициализация баланса после одобрения водителя",
            });
            logger.info(
              `Баланс для водителя ${driverId} создан с начальным значением 0`
            );
          } else {
            logger.info(`Баланс для водителя ${driverId} уже существует`);
          }
          channel.ack(msg);
        } catch (error) {
          logger.error("Ошибка при обработке события driver_approval", {
            error: error.message,
          });
        }
      }
    });
    logger.info("Подписка на события driver_approval установлена");
  } catch (error) {
    logger.error("Ошибка при подписке на driver_approval", {
      error: error.message,
    });
  }
};
