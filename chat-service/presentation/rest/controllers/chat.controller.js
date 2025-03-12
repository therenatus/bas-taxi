import { ApplicationError } from '../../../application/exceptions/application.error.js';

export class ChatController {
    #chatService;

    constructor(chatService) {
        this.#chatService = chatService;
    }

    getChatHistory = async (req, res) => {
        try {
            const { id: userId, role } = req.user;
            const { rideId, counterpartId } = req.query;

            const messages = await this.#chatService.getChatHistory({
                userId,
                role,
                rideId,
                counterpartId
            });

            this.#sendSuccess(res, 200, { messages });
        } catch (error) {
            ApplicationError.handle(error, res);
        }
    };

    sendMessage = async (req, res) => {
        try {
            const { id: userId } = req.user;
            const message = await this.#chatService.sendMessage({
                ...req.body,
                senderId: userId
            });

            this.#sendSuccess(res, 201, message);
        } catch (error) {
            ApplicationError.handle(error, res);
        }
    };

    #sendSuccess = (res, status, data) => {
        res.status(status).json({
            success: true,
            data
        });
    };
}