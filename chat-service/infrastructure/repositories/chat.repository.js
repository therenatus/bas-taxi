import { ChatEntity } from '../../domain/entities/chat.entity.js';
import { ApplicationError } from '../../application/exceptions/application.error.js';

export class ChatRepository {
    #sequelizeModel;
    #participantRepository;
    #rideClient

    constructor(sequelizeModel, participantRepository, rideClient) {
        this.#sequelizeModel = sequelizeModel;
        this.#participantRepository = participantRepository;
        this.#rideClient = rideClient;
    }

    async #toDomainEntity(chatModel) {
        if (!chatModel) {
            return null;
        }

        if (!this.#participantRepository || !this.#participantRepository.findByChatId) {
            throw new Error("ParticipantRepository или метод findByChatId не определен");
        }

        const participants = await this.#participantRepository.findByChatId(chatModel.id);
        const participantIds = participants.map(p => p.user_id);

        return {
            id: chatModel.id,
            status: chatModel.status,
            lastActivity: chatModel.lastActivity,
            rideId: chatModel.rideId,
            type: chatModel.type,
            participantIds,
            createdAt: chatModel.createdAt,
            updatedAt: chatModel.updatedAt,
        };
    }


    #toDatabaseFormat(chat) {
        return {
            id: chat.id,
            ride_id: chat.rideId,
            status: chat.status,
            last_activity: chat.lastActivity,
            type: chat.type,
            admin_id: chat.adminId
        };
    }

    async save(chat) {
        try {
            let dbChat;

            const rideExists = await this.#checkRideExists(chat.rideId);
            if (!rideExists) {
                throw new ApplicationError(
                    `Ride с ID ${chat.rideId} не найден`,
                    'NOT_FOUND',
                    404
                );
            }

            if (chat.id) {
                dbChat = await this.#sequelizeModel.findByPk(chat.id, {
                    include: ['participants', 'messages'],
                });

                if (!dbChat) {
                    throw new ApplicationError("Чат не найден", "NOT_FOUND", 404);
                }

                await dbChat.update(this.#toDatabaseFormat(chat));
            } else {
                dbChat = await this.#sequelizeModel.create(this.#toDatabaseFormat(chat));
            }

            await this.#participantRepository.syncParticipants(
                dbChat.id,
                chat.participantIds
            );

            const updatedDbChat = await this.#sequelizeModel.findByPk(dbChat.id, {
                include: ['participants', 'messages']
            });

            return this.#toDomainEntity(updatedDbChat, chat);
        } catch (error) {
            console.error('Error during save:', error);
            throw new ApplicationError(
                error.message || "Ошибка сохранения чата",
                error.code || "DATABASE_ERROR",
                error.statusCode || 500
            );
        }
    }

    async #checkRideExists(rideId) {
        try {
            const ride = await this.#rideClient.get(`/rides/${rideId}`);
            return ride && ride.data ? true : false;
        } catch (error) {
            return false;
        }
    }


    async findByRide(rideId) {
        try {
            const dbChat = await this.#sequelizeModel.findOne({
                where: { ride_id: rideId },
                include: ['participants', 'messages'],
            });

            return dbChat ? this.#toDomainEntity(dbChat) : null;
        } catch (error) {
            console.error('Ошибка поиска чата по rideId:', error);
            throw new ApplicationError(
                error.message || "Ошибка поиска чата",
                'DATABASE_ERROR',
                500
            );
        }
    }

    async findByUser(userId) {
        try {
            const chatModel = await this.#sequelizeModel.findOne({
                include: [{
                    model: this.#participantRepository.participantModel,
                    as: 'participants',
                    where: { user_id: userId }
                }]
            });
            return chatModel ? this.#toDomainEntity(chatModel) : null;
        } catch (error) {
            console.error('Ошибка поиска чата по пользователю:', error);
            throw new ApplicationError(
                `Ошибка поиска чата для пользователя ${userId}: ${error.message}`,
                "DATABASE_ERROR",
                500
            );
        }
    }

    async findById(chatId) {
        try {
            const dbChat = await this.#sequelizeModel.findByPk(chatId, {
                include: ['participants', 'messages']
            });
            return dbChat ? this.#toDomainEntity(dbChat, {}) : null;
        } catch (error) {
            throw new ApplicationError(
                'Failed to fetch chat',
                'DATABASE_ERROR',
                500
            );
        }
    }
}
