import cors from "cors";
import express from "express";
import http from "http";
import swaggerJsdoc from "swagger-jsdoc";
import { AuthService } from "./application/services/auth.servcie.js";
import { ChatService } from "./application/services/message.service.js";
import { AdminClient } from "./infrastructure/clients/admin.client.js";
import { DriverClient } from "./infrastructure/clients/driver.client.js";
import { PassengerClient } from "./infrastructure/clients/passanger.client.js";
import { RideClient } from "./infrastructure/clients/ride.client.js";
import logger from "./infrastructure/config/logger.js";
import Database from "./infrastructure/database/sequelize.js";
import { RabbitMQProducer } from "./infrastructure/event-bus/rmg.producer.js";
import { AttachmentRepository } from "./infrastructure/repositories/attachment.repository.js";
import { ChatRepository } from "./infrastructure/repositories/chat.repository.js";
import { MessageRepository } from "./infrastructure/repositories/message.repository.js";
import { ParticipantRepository } from "./infrastructure/repositories/participant.repository.js";
import { UserRepository } from "./infrastructure/repositories/user.repository.js";
import { CacheService } from "./infrastructure/services/cache.service.js";
import { SocketIOAdapter } from "./infrastructure/websocket/socker.adapter.js";
import { PresentationLayer } from "./presentation/index.js";

const API_GATEWAY_URL =
  process.env.API_GATEWAY_URL || "http://api-gateway:8000";
const PORT = process.env.PORT || 3014;

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Chat Service API",
      version: "1.0.0",
      description: "API для управления чатами и сообщениями",
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: "Локальный сервер",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ["./presentation/rest/routes/*.js"],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

async function bootstrap() {
  const app = express();
  app.use(express.json());
  app.use(cors());

  const server = http.createServer(app);

  const socketAdapter = new SocketIOAdapter(server);

  const rabbitPublisher = new RabbitMQProducer({
    url: process.env.RABBITMQ_URL || "amqp://localhost",
    exchange: "rides",
  });
  await rabbitPublisher.connect();

  const compositeEventPublisher = {
    rabbit: rabbitPublisher,
    socket: socketAdapter,
  };

  const models = await Database.connect();

  const driverClient = new DriverClient({ baseURL: API_GATEWAY_URL });
  const passengerClient = new PassengerClient({ baseURL: API_GATEWAY_URL });
  const adminClient = new AdminClient({ baseURL: API_GATEWAY_URL });
  const rideClient = new RideClient({ baseURL: API_GATEWAY_URL });

  const cacheService = new CacheService();
  const participantRepository = new ParticipantRepository(
    models.ChatParticipant
  );
  const userRepository = new UserRepository({
    driverClient,
    passengerClient,
    adminClient,
  });

  const attachmentRepository = new AttachmentRepository(models.Attachment);
  const chatRepository = new ChatRepository(
    models.Chat,
    participantRepository,
    rideClient
  );
  const messageRepository = new MessageRepository({
    sequelizeModel: models.Message,
    attachmentRepository,
    userRepository,
    cacheService,
    rideClient,
  });

  const chatService = new ChatService({
    messageRepository,
    userRepository,
    rideClient,
    chatRepository,
    fileStorage: undefined,
    eventPublisher: compositeEventPublisher,
  });

  messageRepository.setChatService(chatService);

  console.log("=== Создание AuthService ===");
  console.log("JWT_SECRET из process.env:", process.env.JWT_SECRET);
  const authService = new AuthService();
  console.log("=== AuthService создан ===");

  const presentation = new PresentationLayer({
    authService,
    chatService,
    port: PORT,
  });

  presentation.start();
  logger.info(`Сервер запущен на порту ${PORT}`);
  logger.info(
    `Swagger docs доступны по адресу http://localhost:${PORT}/api-docs`
  );
}

bootstrap();
