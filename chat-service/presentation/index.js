import { createRestServer } from "./rest/server.js";
import { createWebSocketServer } from "./websocket/server.js";
import { createChatRoutes } from "./rest/routes/chat.router.js";
import { ChatController } from "./rest/controllers/chat.controller.js";
import {ApplicationError} from "../application/exceptions/application.error";

export class PresentationLayer {
    #restServer;
    #websocketServer;

    constructor({ authService, chatService }) {
        const chatController = new ChatController(chatService);
        const chatRouter = createChatRoutes({
            chatController,
            authService
        });

        this.#restServer = createRestServer(
            { chatRouter },
            { errorHandler: ApplicationError.handle }
        );

        this.#websocketServer = createWebSocketServer(
            this.#restServer,
            chatService
        );
    }

    start(port) {
        const server = this.#restServer.listen(port, () => {
            console.log(`Server running on port ${port}`);
        });
        this.#websocketServer.attach(server);
        return server;
    }
}