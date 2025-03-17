// файл: infrastructure/repositories/chat.repository.js

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

    // Метод преобразования данных из БД в доменную сущность
    // Если ассоциация participants не загружена, используем originalChat.participantIds для формирования «заглушек»
    async #toDomainEntity(chatModel) {
        if (!chatModel) {
            return null;
        }

        // Проверка, чтобы participantRepository был определен
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



    // Преобразование объекта чата в формат, подходящий для сохранения в БД
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

            // Проверяем, существует ли rideId через внешний RideClient
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

// Проверка существования ride через rideClient
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
