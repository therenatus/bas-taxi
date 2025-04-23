import logger from "../utils/logger.js";
import { assertExchange, getChannel } from "../utils/rabbitmq.js";
import { emitToDriver } from "./websoket.service.js";

export const notifyNearbyDrivers = async (rideId, drivers, correlationId) => {
  const exchangeName = "driver_notifications_exchange";

  try {
    await assertExchange(exchangeName, "fanout");

    const channel = await getChannel();

    for (const driver of drivers) {
      const message = {
        event: "new_ride_request",
        data: { rideId, distance: driver.distance },
        timestamp: new Date().toISOString(),
      };

      channel.publish(exchangeName, "", Buffer.from(JSON.stringify(message)), {
        contentType: "application/json",
        headers: {
          "x-correlation-id": correlationId,
          driverId: driver.driverId,
        },
      });

      emitToDriver(driver.driverId, message);

      logger.info("Водитель уведомлен", {
        driverId: driver.driverId,
        rideId,
        correlationId,
      });
    }
  } catch (error) {
    logger.error("Ошибка уведомления водителей", {
      error: error.message,
      rideId,
      correlationId,
    });
    throw error;
  }
};

export const cancelRideNotifications = async (rideId) => {
  const channel = await getChannel();
  const exchangeName = "driver_notifications_exchange";

  const message = {
    event: "ride_cancelled",
    data: { rideId },
    timestamp: new Date().toISOString(),
  };

  channel.publish(exchangeName, "", Buffer.from(JSON.stringify(message)), {
    contentType: "application/json",
  });

  logger.info("Уведомления об отмене отправлены", { rideId });
};
