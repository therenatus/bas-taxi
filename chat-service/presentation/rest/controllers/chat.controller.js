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

    getMyChat = async (req, res) => {
        try {
            const userId = req.user.id;
            const chat = await this.#chatService.getMyChat(userId);
            res.status(200).json(chat);
        } catch (error) {
            res.status(500).json({
                error: {
                    code: error.code || 'SERVICE_ERROR',
                    message: error.message
                }
            });
        }
    };
    sendMessage = async (req, res) => {
        try {
            const { receiverType, receiverId, text } = req.body;
            const validTypes = ['driver', 'passenger', 'admin'];
            if (!validTypes.includes(receiverType)) {
                throw new ApplicationError('Недопустимый тип получателя', 'INVALID_RECEIVER_TYPE', 400);
            }
            const receiverCompositeId = `${receiverType}:${receiverId}`;

            const { userId, userType, compositeId } = req.user;

            const message = await this.#chatService.sendMessage({
                senderId: compositeId,
                receiverId: receiverCompositeId,
                text,
                rideId: req.body.rideId
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