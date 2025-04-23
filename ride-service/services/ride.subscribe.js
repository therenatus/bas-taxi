import Driver from "../models/driver.model.js";
import ProcessedMessage from "../models/procces-message.model.js";
import Ride from "../models/ride.model.js";
import logger from "../utils/logger.js";
import { getChannel } from "../utils/rabbitmq.js";
import { publishRideEvent } from "./event.publisher.js";
import { processRideGeoData } from "./ride.service.js";

export const startRideSubscribers = async (webSocketService) => {
  await subscribeToGeoEvents(webSocketService);
  await subscribeToPaymentEvents(webSocketService);
  await subscribeToDriverLocationUpdates(webSocketService);
};

const subscribeToGeoEvents = async (webSocketService) => {
  const channel = await getChannel();
  const exchangeName = "geo_events";
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

        const alreadyProcessed = await ProcessedMessage.findOne({
          where: { messageId },
        });
        if (alreadyProcessed) {
          logger.info(`Сообщение с ID ${messageId} уже обработано`);
          return;
        }

        if (message.event === "ride_geo_data") {
          try {
            await processRideGeoData(message.data, correlationId);

            const rideId = message.data.rideId;
            webSocketService.emitRideUpdate(rideId, {
              event: "ride_geo_data",
              data: message.data,
            });

            await ProcessedMessage.create({
              messageId,
              processedAt: new Date(),
            });
          } catch (error) {
            logger.error("Ошибка при обработке гео-данных поездки", {
              error: error.message,
              correlationId,
            });
          }
        }
      }
    },
    { noAck: true }
  );

  logger.info("Подписка на geo_events установлена");
};

const subscribeToPaymentEvents = async (webSocketService) => {
  const channel = await getChannel();
  const exchangeName = "payment_events";
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

        const alreadyProcessed = await ProcessedMessage.findOne({
          where: { messageId },
        });
        if (alreadyProcessed) {
          logger.info(`Сообщение с ID ${messageId} уже обработано`);
          return;
        }

        if (message.event === "payment_success") {
          try {
            const ride = await Ride.findByPk(message.data.rideId);
            if (ride && ride.paymentType === "card") {
              ride.status = "in_progress";
              await ride.save();

              logger.info('Статус поездки обновлен на "in_progress"', {
                rideId: ride.id,
                correlationId,
              });
              await publishRideEvent("ride_started", ride, correlationId);
              webSocketService.emitRideUpdate(ride.id, {
                event: "payment_success",
                data: { rideId: ride.id, status: "in_progress" },
              });
            }

            await ProcessedMessage.create({
              messageId,
              processedAt: new Date(),
            });
          } catch (error) {
            logger.error("Ошибка при обработке события платежа", {
              error: error.message,
              correlationId,
            });
          }
        }
      }
    },
    { noAck: true }
  );

  logger.info("Подписка на payment_events установлена");
};

const subscribeToDriverLocationUpdates = async (webSocketService) => {
  const channel = await getChannel();
  const exchangeName = "driver_location_updates";
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

        const alreadyProcessed = await ProcessedMessage.findOne({
          where: { messageId },
        });
        if (alreadyProcessed) {
          logger.info(`Сообщение с ID ${messageId} уже обработано`);
          return;
        }

        if (message.event === "driver_location_update") {
          try {
            const { driverId, latitude, longitude, isParkingMode } =
              message.data;

            if (isParkingMode) {
              webSocketService.emitParkingStatus(driverId, {
                driverId,
                latitude,
                longitude,
              });
            }

            await ProcessedMessage.create({
              messageId,
              processedAt: new Date(),
            });
          } catch (error) {
            logger.error(
              "Ошибка при обработке обновления местоположения водителя",
              { error: error.message, correlationId }
            );
          }
        }
      }
    },
    { noAck: true }
  );

  logger.info("Подписка на driver_location_updates установлена");
};

export const subscribeToDriverApproval = async () => {
  const channel = await getChannel();
  const exchangeName = "driver_approval";

  await channel.assertExchange(exchangeName, "fanout", { durable: true });
  const q = await channel.assertQueue("", { exclusive: true });
  await channel.bindQueue(q.queue, exchangeName, "");

  channel.consume(
    q.queue,
    async (msg) => {
      if (msg.content) {
        const message = JSON.parse(msg.content.toString());
        console.log({ message });
        logger.info("Получено событие от driver_approval", {
          event: message.event,
        });

        try {
          const existingDriver = await Driver.findByPk(message.driverId);
          if (existingDriver) {
            logger.info("Водитель уже существует, пропускаем создание", {
              driverId: message.driverId,
            });
            return;
          }

          const newDriver = await Driver.create({
            driverId: message.driverId,
            isOnline: false,
            isParkingMode: false,
          });
          console.log("New driver created:", newDriver);

          logger.info("Создан новый водитель", { driverId: newDriver.id });
        } catch (error) {
          logger.error("Ошибка обработки одобрения водителя", {
            error: error.message,
          });
        }
      }
    },
    { noAck: true }
  );

  logger.info("Подписка на driver_approval установлена");
};
