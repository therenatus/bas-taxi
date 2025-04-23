import express from "express";
import http from "http";
import client from "prom-client";
import rideRoute from "./routes/ride.route.js";
import tariffRoute from "./routes/tariff.route.js";
import {
  startRideSubscribers,
  subscribeToDriverApproval,
} from "./services/ride.subscribe.js";
import { subscribeToTariffUpdates } from "./services/tariff.service.js";
import {
  createWebSocketService,
  isWebSocketRunning,
} from "./services/websoket.service.js";
import setupSwagger from "./swagger.js";
import config from "./utils/config.js";
import { connectDB } from "./utils/database.js";
import logger from "./utils/logger.js";
import { connectRabbitMQ } from "./utils/rabbitmq.js";

const startServer = async () => {
  const app = express();
  app.use(express.json());

  try {
    await connectDB();
    logger.info("База данных успешно подключена");
  } catch (error) {
    logger.error(
      "Ошибка подключения к базе данных. Завершаем процесс...",
      error.message
    );
    process.exit(1);
  }

  try {
    await connectRabbitMQ();
    logger.info("RabbitMQ успешно подключен");
  } catch (error) {
    logger.error(
      "Ошибка подключения к RabbitMQ. Завершаем процесс...",
      error.message
    );
    process.exit(1);
  }

  const server = http.createServer(app);
  let websocketService;
  try {
    websocketService = createWebSocketService(server);
    logger.info("WebSocket успешно настроен");
  } catch (error) {
    logger.error(
      "Ошибка настройки WebSocket. Завершаем процесс...",
      error.message
    );
    process.exit(1);
  }

  // app.get('/send-test-notification', (req, res) => {
  //     const driverId = 1; // Пример ID водителя
  //     const passengerId = 1; // Пример ID пассажира

  //     emitToDriver(driverId, {
  //         event: 'tst',
  //         data: {
  //             message: 'тестовое уведомление водителю!!!'
  //         }
  //     });

  //     emitToPassenger(passengerId, {
  //         event: 'ride_accepted',
  //         data: {
  //             message: 'тестовое уведомление пассажиру!!!'
  //         }
  //     });
  //     res.send('Тестовые уведомления отправлены!');
  // });
  setupSwagger(app);
  app.use("/", rideRoute);
  app.use("/api/tariff", tariffRoute);

  app.get("/ws-status", (req, res) => {
    if (isWebSocketRunning()) {
      res.json({ websocket: "running" });
    } else {
      res.status(503).json({ websocket: "not running" });
    }
  });

  const collectDefaultMetrics = client.collectDefaultMetrics;
  collectDefaultMetrics({ timeout: 5000 });

  app.get("/metrics", async (req, res) => {
    try {
      res.set("Content-Type", client.register.contentType);
      res.end(await client.register.metrics());
    } catch (error) {
      logger.error("Ошибка при получении метрик", error.message);
      res.status(500).end(error);
    }
  });

  app.get("/health", (req, res) => {
    res.json({ status: "ok" });
  });

  try {
    await startRideSubscribers(websocketService);
    logger.info("Ride-события успешно настроены");

    await subscribeToTariffUpdates();
    logger.info("Тарифные подписчики успешно настроены");

    await subscribeToDriverApproval();
    logger.info("Driver подписчики успешно настроены");
  } catch (error) {
    logger.error(
      "Ошибка настройки подписчиков. Завершаем процесс...",
      error.message
    );
    process.exit(1);
  }

  const PORT = config.port || 3000;
  server.listen(PORT, () => {
    logger.info(`Сервис запущен на порту ${PORT}`);
  });

  return server;
};

startServer().catch((error) => {
  logger.error("Фатальная ошибка при запуске сервера", error.message);
  process.exit(1);
});
