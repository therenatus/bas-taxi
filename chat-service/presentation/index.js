import http from "http";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";
import { createRestServer } from "./rest/server.js";
import { createWebSocketServer } from "./websocket/server.js";
import { createChatRoutes } from "./rest/routes/chat.router.js";
import { ChatController } from "./rest/controllers/chat.controller.js";
import { ApplicationError } from "../application/exceptions/application.error.js";
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class PresentationLayer {
    #restApp;
    #httpServer;
    #websocketServer;
    #port = process.env.PORT || 3014;

    constructor({ authService, chatService }) {
        const chatController = new ChatController(chatService);
        const chatRouter = createChatRoutes({
            chatController,
            authService
        });

        this.#restApp = createRestServer(
            { chatRouter },
            { errorHandler: ApplicationError.handle }
        );

        this.#setupSwagger();

        this.#httpServer = http.createServer(this.#restApp);

        this.#websocketServer = createWebSocketServer(
            this.#httpServer,
            chatService
        );
    }

    #setupSwagger() {
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
                        url: `http://localhost:${this.#port}`,
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

            apis: [path.join(__dirname, 'rest/routes/chat.router.js')],
        };

        const swaggerSpec = swaggerJsdoc(swaggerOptions);
        this.#restApp.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
    }

    start() {
        this.#httpServer.listen(this.#port, () => {
            console.log(`Server running on port ${this.#port}`);
            console.log(`Swagger docs available at http://localhost:${this.#port}/chats/api-docs`);
        });
        return this.#httpServer;
    }
}
