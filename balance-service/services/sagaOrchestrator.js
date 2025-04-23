import BalanceModel from "../models/balance.model.js";
import TransactionModel from "../models/transaction.model.js";
import logger from "../utils/logger.js";
import { getChannel } from "../utils/rabbitmq.js";

export const publishBalanceEvent = async (event, data) => {
  try {
    const channel = await getChannel();
    const exchangeName = "payment_saga";
    await channel.assertExchange(exchangeName, "topic", { durable: true });

    const message = {
      sagaId: data.rideId,
      event,
      data,
    };

    const routingKey = `balance.${event}`;
    channel.publish(
      exchangeName,
      routingKey,
      Buffer.from(JSON.stringify(message))
    );
    logger.info(`Событие "${routingKey}" опубликовано`, message);
  } catch (error) {
    logger.error("Ошибка при публикации события баланса", {
      error: error.message,
    });
    throw error;
  }
};

export const initiatePaymentSaga = async (paymentData) => {
  try {
    const balance = await BalanceModel.findOne({
      where: { userId: paymentData.passengerId },
    });

    if (!balance || balance.amount < paymentData.amount) {
      logger.warn("Недостаточно средств на балансе", {
        userId: paymentData.passengerId,
        required: paymentData.amount,
        available: balance ? balance.amount : 0,
      });
      throw new Error("Недостаточно средств на балансе");
    }

    const transaction = await TransactionModel.create({
      userId: paymentData.passengerId,
      amount: -paymentData.amount,
      type: "ride_payment",
      status: "pending",
      metadata: {
        rideId: paymentData.rideId,
      },
    });

    logger.info("Создана запись о транзакции", {
      transactionId: transaction.id,
      rideId: paymentData.rideId,
    });

    await publishBalanceEvent("payment_initiated", {
      ...paymentData,
      transactionId: transaction.id,
    });

    logger.info('Событие "payment_initiated" опубликовано', {
      rideId: paymentData.rideId,
      transactionId: transaction.id,
    });

    return transaction;
  } catch (error) {
    logger.error("Ошибка при инициации Saga", { error: error.message });
    throw error;
  }
};

export const startConsuming = async () => {
  try {
    const channel = await getChannel();
    const exchangeName = "payment_saga";
    await channel.assertExchange(exchangeName, "topic", { durable: true });

    const queueName = "balance_saga_orchestrator_queue";
    const q = await channel.assertQueue(queueName, { durable: true });

    await channel.bindQueue(q.queue, exchangeName, "balance.#");
    await channel.bindQueue(q.queue, exchangeName, "payment.success");
    await channel.bindQueue(q.queue, exchangeName, "payment.failed");

    logger.info(
      `Очередь "${q.queue}" привязана к обмену "${exchangeName}" с ключами "balance.#", "payment.success", "payment.failed"`
    );

    channel.consume(
      q.queue,
      async (msg) => {
        if (msg.content) {
          try {
            const message = JSON.parse(msg.content.toString());
            logger.info("Получено сообщение в оркестраторе Saga", message);

            switch (message.event) {
              case "payment.success":
                await handlePaymentSuccess(message.data);
                break;
              case "payment.failed":
                await handlePaymentFailed(message.data);
                break;
              default:
                logger.warn("Неизвестное событие", { event: message.event });
            }
          } catch (error) {
            logger.error("Ошибка при обработке сообщения в оркестраторе Saga", {
              error: error.message,
            });
          }
        }

        channel.ack(msg);
      },
      { noAck: false }
    );

    logger.info("Оркестратор Saga начал прослушивание событий");
  } catch (error) {
    logger.error("Ошибка при запуске оркестратора Saga", {
      error: error.message,
    });
  }
};

const handlePaymentSuccess = async (data) => {
  try {
    logger.info('Обработка события "payment.success"', data);

    const transaction = await TransactionModel.findOne({
      where: {
        status: "pending",
        metadata: {
          rideId: data.rideId,
        },
      },
    });

    if (!transaction) {
      logger.warn("Транзакция не найдена", { rideId: data.rideId });
      return;
    }

    await transaction.update({ status: "completed" });

    const balance = await BalanceModel.findOne({
      where: { userId: transaction.userId },
    });

    await balance.update({
      amount: balance.amount + transaction.amount,
    });

    logger.info("Платеж успешно завершен", {
      transactionId: transaction.id,
      rideId: data.rideId,
      newBalance: balance.amount,
    });
  } catch (error) {
    logger.error('Ошибка при обработке события "payment.success"', {
      error: error.message,
    });
  }
};

const handlePaymentFailed = async (data) => {
  try {
    logger.warn('Обработка события "payment.failed"', data);

    const transaction = await TransactionModel.findOne({
      where: {
        status: "pending",
        metadata: {
          rideId: data.rideId,
        },
      },
    });

    if (!transaction) {
      logger.warn("Транзакция не найдена", { rideId: data.rideId });
      return;
    }

    await transaction.update({ status: "cancelled" });

    logger.info("Транзакция отменена", {
      transactionId: transaction.id,
      rideId: data.rideId,
    });
  } catch (error) {
    logger.error('Ошибка при обработке события "payment.failed"', {
      error: error.message,
    });
  }
};
