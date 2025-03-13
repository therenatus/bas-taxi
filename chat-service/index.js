import { PresentationLayer } from "./presentation/index.js";
import { ChatService } from "./application/services/message.service.js";
import Database from "./infrastructure/database/sequelize.js";
import logger from "./infrastructure/config/logger.js";
import {MessageRepository} from "./infrastructure/repositories/message.repository.js";

async function bootstrap() {
    try {
        // 1. Подключаем базу
        const models = await Database.connect();

        // 2. Создаем репозитории с моделями
        const messageRepository = new MessageRepository(models.Message);

        // 3. Создаем application слой (сервис)
        const chatService = new ChatService({ messageRepository });

        // 4. Создаем presentation слой (например, express)
        const presentation = new PresentationLayer({ chatService });

        // 5. Запускаем сервер
        presentation.start(3000);

        logger.info("Сервер запущен на порту 3000");
    } catch (err) {
        logger.error("Ошибка при инициализации приложения:", err);
        process.exit(1);
    }
}

bootstrap();
