import http from "http";
import { createRestServer } from "./rest/server.js";
import { createWebSocketServer } from "./websocket/server.js";
import { createChatRoutes } from "./rest/routes/chat.router.js";
import { ChatController } from "./rest/controllers/chat.controller.js";
import { ApplicationError } from "../application/exceptions/application.error.js";

export class PresentationLayer {
    #restApp;
    #httpServer;
    #websocketServer;

    constructor({ authService, chatService }) {
        const chatController = new ChatController(chatService);
        const chatRouter = createChatRoutes({
            chatController,
            authService
        });

        // Создаём Express-приложение (не сервер!)
        this.#restApp = createRestServer(
            { chatRouter },
            { errorHandler: ApplicationError.handle }
        );

        // Оборачиваем в HTTP сервер
        this.#httpServer = http.createServer(this.#restApp);

        // Создаём WebSocket сервер
        this.#websocketServer = createWebSocketServer(
            this.#httpServer,
            chatService
        );
    }

    start() {
        this.#httpServer.listen(3014, () => {
            console.log(`Server running on port ${3014}`);
        });
        return this.#httpServer;
    }
}
