import { PresentationLayer } from "./presentation/index.js";
import { ChatService } from "./application/services/message.service.js";
import Database from "./infrastructure/database/sequelize.js";
import logger from "./infrastructure/config/logger.js";
import { MessageRepository } from "./infrastructure/repositories/message.repository.js";
import { AuthService } from "./application/services/auth.servcie.js";
import { DriverClient } from "./infrastructure/clients/driver.client.js";
import { PassengerClient } from "./infrastructure/clients/passanger.client.js";
import { AdminClient } from "./infrastructure/clients/admin.client.js";
import { UserRepository } from "./infrastructure/repositories/user.repository.js";
import { CacheService } from "./infrastructure/services/cache.service.js";
import { ChatRepository } from "./infrastructure/repositories/chat.repository.js";
import { AttachmentRepository } from "./infrastructure/repositories/attachment.repository.js";
import {RideClient} from "./infrastructure/clients/ride.client.js";
import {ParticipantRepository} from "./infrastructure/repositories/participant.repository.js";
import {SocketIOAdapter} from "./infrastructure/websocket/socker.adapter.js";
import {RabbitMQProducer} from "./infrastructure/event-bus/rmg.producer.js";

const API_GATEWAY_URL = process.env.API_GATEWAY_URL || "http://api-gateway:8000";

async function bootstrap() {
    const driverClient = new DriverClient({ baseURL: API_GATEWAY_URL });
    const passengerClient = new PassengerClient({ baseURL: API_GATEWAY_URL });
    const adminClient = new AdminClient({ baseURL: API_GATEWAY_URL });
    const rideClient = new RideClient({ baseURL: API_GATEWAY_URL });
    const rabbitConfig = {
        url: process.env.RABBITMQ_URL || "amqp://localhost",
        exchange: "rides"
    };

    try {
        // 1. Подключаем базу
        const models = await Database.connect();

        // 2. Инициализируем сервисы
        const eventPublisher = new RabbitMQProducer(rabbitConfig);
        await eventPublisher.connect();
        const cacheService = new CacheService();
        const participantRepository = new ParticipantRepository(models.ChatParticipant);
        const userRepository = new UserRepository({ driverClient, passengerClient, adminClient });

        // 3. Инициализируем репозитории
        const attachmentRepository = new AttachmentRepository(models.Attachment);
        const chatRepository = new ChatRepository(models.Chat, participantRepository, rideClient);
        const messageRepository = new MessageRepository({
            sequelizeModel: models.Message,
            attachmentRepository,
            userRepository,
            cacheService,
            rideClient
        });

        const chatService = new ChatService({
            messageRepository,
            userRepository,
            rideClient,
            chatRepository,
            fileStorage: undefined,
            eventPublisher
        });

        // Обновляем зависимость chatService в messageRepository
        messageRepository.setChatService(chatService);

        // 4. Создаем application слой
        const authService = new AuthService({ userRepository });

        // 5. Инициализируем presentation слой
        const presentation = new PresentationLayer({
            authService,
            chatService,
            port: 3014
        });

        // 6. Запускаем сервер
        presentation.start();
        logger.info(`Сервер запущен на порту ${3014}`);

    } catch (err) {
        logger.error("Ошибка при инициализации приложения:", err);
        process.exit(1);
    }
}

bootstrap();