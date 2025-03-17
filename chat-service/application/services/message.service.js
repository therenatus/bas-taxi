import { ApplicationError } from '../exceptions/application.error.js';
import { CreateMessageDTO } from '../dtos/create-message.dto.js';
import logger from "../../infrastructure/config/logger.js";

export class ChatService {
    #messageRepository;
    #userRepository;
    #rideClient;
    #chatRepository
    #fileStorage;
    #eventPublisher;

    constructor({ messageRepository, userRepository, rideClient, chatRepository, fileStorage, eventPublisher }) {
        this.#messageRepository = messageRepository;
        this.#userRepository = userRepository;
        this.#rideClient = rideClient;
        this.#chatRepository = chatRepository;
        this.#fileStorage = fileStorage;
        this.#eventPublisher = eventPublisher;
    }

    async createChat(rideId, driverId, passengerId) {
        console.log('create chat',{ rideId, driverId, passengerId });
        const [driver, passenger] = await Promise.all([
            this.#userRepository.findById(`driver:${driverId}`),
            this.#userRepository.findById(`passenger:${passengerId}`),
        ]);

        // Создаем чат
        const chat = await this.#messageRepository.save({
            rideId,
            driverId: driver.id,
            passengerId: passenger.id,
        });

        return chat;
    }

    // async createSupportChat(userCompositeId, adminId) {
    //     const [user, admin] = await Promise.all([
    //         this.#userRepository.findById(userCompositeId),
    //         this.#userRepository.findById(`admin:${adminId}`)
    //     ]);
    //
    //     const chat = await this.#messageRepository.save({
    //         type: 'support',
    //         admin_id: admin.id,
    //         participants: [user, admin]
    //     });
    //
    //     return chat;
    // }

    sendMessage = async (data) => {
        try {
            const dto = new CreateMessageDTO(data);

            const [sender, receiver] = await Promise.all([
                this.#userRepository.findById(dto.senderId),
                this.#userRepository.findById(dto.receiverId),
            ]);
            console.log({sender});
            console.log({receiver});
            if (!sender || !receiver) {
                throw new ApplicationError('Invalid participants', 'INVALID_PARTICIPANTS', 404);
            }

            // Проверяем наличие чата по rideId
            let chat = await this.#chatRepository.findByRide(dto.rideId);
            console.log({chat})

            // Если чата нет — создаем новый
            if (!chat) {
                chat = await this.createRideChat({
                    rideId: dto.rideId,
                    driverId: sender.id,
                    passengerId: receiver.id,
                    participantIds: [sender.id, receiver.id]
                });
            }

            const messageData = {
                sender_id: dto.senderId,
                receiver_id: dto.receiverId,
                chat_id: chat.id,
                content: dto.text,
                status: 'sent',
                createdAt: new Date(),
            };

            const message = await this.#messageRepository.save(messageData);

            await this.#publishNewMessageEvent(message);

            return message;
        } catch (error) {
            throw this.#handleServiceError(error, 'Failed to send message');
        }
    };

    async createRideChat({ rideId, driverId, passengerId, participantIds }) {
        try {
            // Проверяем, существует ли ride в сервисе
            const { data } = await this.#rideClient.get(`/${rideId}`);
            console.log({data});

            if (!data || !data.id) {
                throw new Error(`Ride with id ${rideId} does not exist.`);
            }

            const chat = await this.#chatRepository.save({
                rideId,
                participantIds,
            });

            return chat;
        } catch (error) {
            console.error("Ошибка создания чата:", error);
            throw new ApplicationError(
                error.message || 'Failed to create ride chat',
                'CHAT_CREATION_ERROR',
                500
            );
        }
    }

    async getChatHistory({ rideId, counterpartId, userId }) {
        try {
            const messages = await this.#messageRepository.findByCriteria({
                rideId,
                $or: [
                    { senderId: userId, receiverId: counterpartId },
                    { senderId: counterpartId, receiverId: userId }
                ]
            });

            if (Array.isArray(messages.data)) {
                console.log(messages.data);
                return messages.data.map(this.#formatMessageResponse);
            } else {
                throw new Error('Неверный формат данных в ответе');
            }
        } catch (error) {
            throw this.#handleServiceError(error, 'Ошибка получения истории');
        }
    }

    async createSupportChat({ userCompositeId, adminId, rideId }) {
        const transaction = await this.#messageRepository.sequelize.transaction();

        try {
            const chat = await this.#messageRepository.save({
                type: 'support',
                ride_id: rideId || null
            }, { transaction });

            // await this.#chatParticipantsRepository.bulkCreate([
            //     { chat_id: chat.id, user_id: userCompositeId },
            //     { chat_id: chat.id, user_id: `admin:${adminId}` }
            // ], { transaction });

            await this.#messageRepository.save({
                text: "Чат поддержки создан",
                senderId: 'system',
                receiverId: 'all',
                chatId: chat.id
            }, { transaction });

            await transaction.commit();
            return chat;
        } catch (error) {
            await transaction.rollback();
            throw this.#handleError(error, 'Ошибка создания чата поддержки');
        }
    }

    #handleError(error, context) {
        if (error instanceof ApplicationError) return error;

        return new ApplicationError(
            `${context}: ${error.message}`,
            'CHAT_SERVICE_ERROR',
            500
        );
    }


    #uploadFile = async (file) => {
        try {
            return await this.#fileStorage.upload({
                buffer: file.buffer,
                filename: file.originalname
            });
        } catch (error) {
            throw new ApplicationError('File upload failed', 'FILE_UPLOAD_ERROR', 500);
        }
    };

    #publishNewMessageEvent = async (message) => {
        await this.#eventPublisher.publish('message_created', {
            id: message.id,
            senderId: message.senderId,
            receiverId: message.receiverId,
            preview: message.text?.substring(0, 50) || '[File attachment]'
        });
    };


    #formatMessageResponse = (message) => ({
        id: message.id,
        content: message.text,
        sender_id: message.senderId,
        receiver_id: message.receiverId,
        attachments: message.attachments,
        status: message.status,
        timestamp: message.timestamp
    });

    #handleServiceError = (error, context) => {
        if (error instanceof ApplicationError) return error;
        return new ApplicationError(
            `${context}: ${error.message}`,
            'SERVICE_ERROR',
            500
        );
    };
}