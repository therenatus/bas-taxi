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

    async findByType(chatType, userId) {
        try {
            const chats = await this.#sequelizeModel.findAll({
                where: { type: chatType },
                include: [{
                    model: this.#participantRepository.participantModel,
                    as: 'participants',
                    where: { user_id: userId }
                }]
            });
            
            return chats.map(chat => this.#toDomainEntity(chat));
        } catch (error) {
            throw new Error(`Error finding chats by type: ${error.message}`);
        }
    }

    async findById(chatId) {
        try {
            const chat = await this.#sequelizeModel.findByPk(chatId);
            return chat ? this.#toDomainEntity(chat) : null;
        } catch (error) {
            throw new Error(`Error finding chat by ID: ${error.message}`);
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

    /**
     * Обновляет статус участника чата
     * @param {string} chatId - ID чата
     * @param {string} userId - ID пользователя
     * @param {Object} updates - Обновления статуса
     * @returns {Promise<Object>} - Обновленный статус участника
     */
    async updateParticipant(chatId, userId, updates) {
        try {
            const [_, [participant]] = await this.#participantRepository.participantModel.update(
                updates,
                {
                    where: {
                        chat_id: chatId,
                        user_id: userId
                    },
                    returning: true
                }
            );
            
            if (!participant) {
                throw new Error(`Participant not found: ${userId} in chat ${chatId}`);
            }
            
            return this.#toParticipantDTO(participant);
        } catch (error) {
            throw new Error(`Error updating participant: ${error.message}`);
        }
    }
    
    /**
     * Добавляет участника в чат
     * @param {string} chatId - ID чата
     * @param {string} userId - ID пользователя
     * @returns {Promise<Object>} - Добавленный участник
     */
    async addParticipant(chatId, userId) {
        try {
            // Проверяем, существует ли чат
            const chat = await this.#sequelizeModel.findByPk(chatId);
            
            if (!chat) {
                throw new Error(`Chat not found: ${chatId}`);
            }
            
            // Проверяем, не является ли пользователь уже участником
            const existing = await this.#participantRepository.participantModel.findOne({
                where: {
                    chat_id: chatId,
                    user_id: userId
                }
            });
            
            if (existing) {
                return this.#toParticipantDTO(existing);
            }
            
            // Добавляем участника
            const participant = await this.#participantRepository.participantModel.create({
                chat_id: chatId,
                user_id: userId,
                joined_at: new Date(),
                role: 'member'
            });
            
            return this.#toParticipantDTO(participant);
        } catch (error) {
            throw new Error(`Error adding participant: ${error.message}`);
        }
    }
    
    /**
     * Удаляет участника из чата
     * @param {string} chatId - ID чата
     * @param {string} userId - ID пользователя
     * @returns {Promise<boolean>} - Результат удаления
     */
    async removeParticipant(chatId, userId) {
        try {
            const deleted = await this.#participantRepository.participantModel.destroy({
                where: {
                    chat_id: chatId,
                    user_id: userId
                }
            });
            
            return deleted > 0;
        } catch (error) {
            throw new Error(`Error removing participant: ${error.message}`);
        }
    }
    
    /**
     * Получает всех участников чата
     * @param {string} chatId - ID чата
     * @returns {Promise<Array>} - Массив участников
     */
    async getParticipants(chatId) {
        try {
            const participants = await this.#participantRepository.participantModel.findAll({
                where: { chat_id: chatId }
            });
            
            return participants.map(p => this.#toParticipantDTO(p));
        } catch (error) {
            throw new Error(`Error getting participants: ${error.message}`);
        }
    }
    
    /**
     * Преобразует модель участника в DTO
     * @private
     */
    #toParticipantDTO(model) {
        return {
            chatId: model.chat_id,
            userId: model.user_id,
            role: model.role,
            joinedAt: model.joined_at,
            archived: model.archived || false,
            muted: model.muted || false
        };
    }
}
