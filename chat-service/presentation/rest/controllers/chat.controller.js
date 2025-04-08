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

    createDriverAdminChat = async (req, res) => {
        try {
            const { driverId, adminId } = req.body;
            
            if (!driverId || !adminId) {
                throw new ApplicationError('Необходимо указать ID водителя и администратора', 'MISSING_PARAMETERS', 400);
            }

            const chat = await this.#chatService.createDriverAdminChat({
                driverId,
                adminId: adminId || req.user.userId // Если adminId не указан, используем ID текущего пользователя
            });

            this.#sendSuccess(res, 201, chat);
        } catch (error) {
            ApplicationError.handle(error, res);
        }
    };

    getDriverAdminChats = async (req, res) => {
        try {
            const userId = req.user.compositeId; // Получаем составной ID пользователя
            const chats = await this.#chatService.getDriverAdminChats(userId);
            
            this.#sendSuccess(res, 200, chats);
        } catch (error) {
            ApplicationError.handle(error, res);
        }
    };

    createPassengerAdminChat = async (req, res) => {
        try {
            const { passengerId, adminId } = req.body;
            
            if (!passengerId || !adminId) {
                throw new ApplicationError('Необходимо указать ID пассажира и администратора', 'MISSING_PARAMETERS', 400);
            }

            const chat = await this.#chatService.createChat({
                type: 'passenger_admin',
                participantIds: [`passenger:${passengerId}`, `admin:${adminId}`],
                metadata: {
                    createdBy: req.user.compositeId
                }
            });

            this.#sendSuccess(res, 201, chat);
        } catch (error) {
            ApplicationError.handle(error, res);
        }
    };

    getPassengerAdminChats = async (req, res) => {
        try {
            const userId = req.user.compositeId;
            const chats = await this.#chatService.getChatsByType('passenger_admin', userId);
            
            this.#sendSuccess(res, 200, chats);
        } catch (error) {
            ApplicationError.handle(error, res);
        }
    };

    createGroupChat = async (req, res) => {
        try {
            const { name, participantIds } = req.body;
            
            if (!name || !participantIds || !Array.isArray(participantIds) || participantIds.length < 2) {
                throw new ApplicationError(
                    'Необходимо указать название и как минимум 2 участников чата', 
                    'INVALID_PARAMETERS', 
                    400
                );
            }

            // Всегда добавляем создателя в чат
            if (!participantIds.includes(req.user.compositeId)) {
                participantIds.push(req.user.compositeId);
            }

            const chat = await this.#chatService.createChat({
                type: 'group',
                participantIds,
                metadata: {
                    name,
                    createdBy: req.user.compositeId
                }
            });

            this.#sendSuccess(res, 201, chat);
        } catch (error) {
            ApplicationError.handle(error, res);
        }
    };
}