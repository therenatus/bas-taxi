import { MessageEntity } from '../../domain/entities/message.entity.js';
import { ApplicationError } from '../../application/exceptions/application.error.js';
import {Op, Transaction} from 'sequelize';
import logger from "../config/logger.js";
import { Sequelize } from 'sequelize';

export class MessageRepository {
    #sequelizeModel;
    #attachmentRepository;
    #chatService;
    #userRepository;
    #cacheService;
    #rideClient;

    constructor({
                    sequelizeModel,
                    attachmentRepository,
                    userRepository,
                    cacheService,
                    rideClient,
                }) {
        this.#sequelizeModel = sequelizeModel;
        this.#attachmentRepository = attachmentRepository;
        this.#userRepository = userRepository;
        this.#cacheService = cacheService;
        this.#rideClient = rideClient;
        this.#chatService = null;
    }

    setChatService(chatService) {
        this.#chatService = chatService;
    }


    async save(messageData, options = {}) {
        try {
            const message = await this.#sequelizeModel.create(messageData, options);
            return this.#toDomainEntity(message);
        } catch (error) {
            throw new Error(`Failed to save message: ${error.message}`);
        }
    }


    async #getOrCreateChatId(message) {
        try {
            logger.info('Поиск существующего чата для rideId:', message.rideId);
            const existingChat = await this.#findChatByRideId(message.rideId);

            if (existingChat) {
                logger.info('Найден существующий чат:', existingChat.id);
                return existingChat.id;
            }

            logger.info('Создание нового чата для rideId:', message.rideId);
            const newChat = await this.#createChat(message);
            return newChat.id;
        } catch (error) {
            logger.error('Ошибка при получении/создании чата:', error);
            throw error;
        }
    }

    async #createChat(message) {
        if (!this.#chatService) {
            throw new ApplicationError(
                'ChatService не инициализирован',
                'SERVICE_ERROR',
                500
            );
        }

        if (message.chatType === 'support') {
            return this.#chatService.createSupportChat({
                userCompositeId: message.senderId,
                adminId: message.receiverId?.split(':')[1],
                rideId: message.rideId
            });
        }

        const { data: ride } = await this.#rideClient.get(`/${message.rideId}`);
        const chat = await this.#chatService.createRideChat({
            rideId: message.rideId,
            driverId: ride.driverId,
            passengerId: ride.passengerId
        });

        if (!chat?.id) {
            throw new Error("Не удалось создать чат");
        }

        return chat;
    }

    // async #createChat(message) {
    //     console.log('#createChat:', message);
    //     if (!this.#chatService) {
    //         throw new ApplicationError(
    //             'ChatService не инициализирован',
    //             'SERVICE_ERROR',
    //             500
    //         );
    //     }
    //
    //     if (message.chatType === 'support') {
    //         return this.#chatService.createSupportChat({
    //             userCompositeId: message.senderId,
    //             adminId: message.receiverId?.split(':')[1],
    //             rideId: message.rideId
    //         });
    //     }
    //
    //     if (!message.rideId) {
    //         throw new ApplicationError(
    //             'Для создания чата требуется rideId',
    //             'VALIDATION_ERROR',
    //             400
    //         );
    //     }
    //
    //     const { data } = await this.#rideClient.get(`/${message.rideId}`);
    //     return this.#chatService.createChat(
    //         message.rideId,
    //         data.driverId,
    //         data.passengerId
    //     );
    // }


    async findByChatId(chatId, pagination = { page: 1, pageSize: 50 }) {
        const cacheKey = `messages:chat:${chatId}:page:${pagination.page}`;

        try {
            const cached = await this.#cacheService.get(cacheKey);
            if (cached) return cached;

            const result = await this.#sequelizeModel.findAndCountAll({
                where: { chat_id: chatId },
                include: ['attachments'],
                limit: pagination.pageSize,
                offset: (pagination.page - 1) * pagination.pageSize,
                order: [[pagination.sortField || 'created_at', pagination.sortOrder || 'DESC']]
            });

            const response = {
                data: result.rows.map(this.#toDomainEntity),
                total: result.count,
                page: pagination.page,
                pageSize: pagination.pageSize
            };

            await this.#cacheService.set(cacheKey, response, 300);
            return response;
        } catch (error) {
            logger.error(`Ошибка получения сообщений: ${error.message}`);
            throw this.#handleError(error, 'Ошибка получения сообщений');
        }
    }

    async findByCriteria(criteria = {}, pagination = { page: 1, pageSize: 50 }) {
        const cacheKey = `messages:criteria:${JSON.stringify(criteria)}:page:${pagination.page}`;

        try {
            const cached = await this.#cacheService.get(cacheKey);
            if (cached) return cached;

            const where = this.#buildWhereClause(criteria);
            const include = this.#buildIncludeClause(criteria);

            const result = await this.#sequelizeModel.findAndCountAll({
                where,
                include,
                limit: pagination.pageSize,
                offset: (pagination.page - 1) * pagination.pageSize,
                order: [[pagination.sortField || 'created_at', pagination.sortOrder || 'DESC']]
            });

            const response = {
                data: result.rows.map(this.#toDomainEntity),
                total: result.count,
                ...pagination
            };

            await this.#cacheService.set(cacheKey, response, 300);
            return response;
        } catch (error) {
            logger.error(`Ошибка поиска по критериям: ${error.message}`);
            throw this.#handleError(error, 'Ошибка поиска сообщений');
        }
    }

    /**
     * Обновляет статус сообщения
     * @param {string} messageId - ID сообщения
     * @param {string} status - Новый статус (delivered, read)
     * @param {Date} [timestamp] - Временная метка изменения статуса
     * @returns {Promise<Object>} - Обновленное сообщение
     */
    async updateStatus(messageId, status, timestamp = new Date()) {
        try {
            const statusField = status === 'read' ? 'read_at' : 'delivered_at';
            
            const [updated, messages] = await this.#sequelizeModel.update(
                { 
                    status, 
                    [statusField]: timestamp 
                },
                { 
                    where: { id: messageId },
                    returning: true 
                }
            );
            
            if (updated === 0) {
                throw new Error(`Message with ID ${messageId} not found`);
            }
            
            return this.#toDomainEntity(messages[0]);
        } catch (error) {
            throw new Error(`Failed to update message status: ${error.message}`);
        }
    }
    
    /**
     * Отмечает сообщение как доставленное
     * @param {string} messageId - ID сообщения
     * @returns {Promise<Object>} - Обновленное сообщение
     */
    async markAsDelivered(messageId) {
        return this.updateStatus(messageId, 'delivered');
    }
    
    /**
     * Отмечает сообщение как прочитанное
     * @param {string} messageId - ID сообщения
     * @returns {Promise<Object>} - Обновленное сообщение
     */
    async markAsRead(messageId) {
        return this.updateStatus(messageId, 'read');
    }
    
    /**
     * Отмечает все сообщения в чате как прочитанные для указанного пользователя
     * @param {string} chatId - ID чата
     * @param {string} userId - ID пользователя, который прочитал сообщения
     * @returns {Promise<number>} - Количество обновленных сообщений
     */
    async markAllAsRead(chatId, userId) {
        try {
            const timestamp = new Date();
            
            const [updated] = await this.#sequelizeModel.update(
                { 
                    status: 'read', 
                    read_at: timestamp 
                },
                { 
                    where: { 
                        chat_id: chatId, 
                        receiver_id: userId,
                        status: { [Op.ne]: 'read' } 
                    }
                }
            );
            
            return updated;
        } catch (error) {
            throw new Error(`Failed to mark messages as read: ${error.message}`);
        }
    }
    
    /**
     * Получает количество непрочитанных сообщений для пользователя
     * @param {string} userId - ID пользователя
     * @param {string} [chatId] - ID конкретного чата (опционально)
     * @returns {Promise<number>} - Количество непрочитанных сообщений
     */
    async getUnreadCount(userId, chatId = null) {
        try {
            const whereClause = { 
                receiver_id: userId,
                status: { [Op.ne]: 'read' }
            };
            
            if (chatId) {
                whereClause.chat_id = chatId;
            }
            
            const count = await this.#sequelizeModel.count({
                where: whereClause
            });
            
            return count;
        } catch (error) {
            throw new Error(`Failed to get unread message count: ${error.message}`);
        }
    }
    
    /**
     * Получает непрочитанные сообщения для пользователя по чатам
     * @param {string} userId - ID пользователя
     * @returns {Promise<Object>} - Объект с количеством непрочитанных сообщений по чатам
     */
    async getUnreadCountByChat(userId) {
        try {
            const results = await this.#sequelizeModel.findAll({
                attributes: [
                    'chat_id',
                    [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
                ],
                where: { 
                    receiver_id: userId,
                    status: { [Op.ne]: 'read' }
                },
                group: ['chat_id']
            });
            
            return results.reduce((acc, result) => {
                acc[result.chat_id] = parseInt(result.get('count'), 10);
                return acc;
            }, {});
        } catch (error) {
            throw new Error(`Failed to get unread messages by chat: ${error.message}`);
        }
    }

    #isValidMessage(message) {
        return message.text?.trim() || message.attachments?.length > 0;
    }

    // async #createChat(message) {
    //     if (message.chatType === 'support') {
    //         return this.#chatService.createSupportChat({
    //             userCompositeId: message.senderId,
    //             adminId: message.receiverId?.split(':')[1],
    //             rideId: message.rideId
    //         });
    //     }
    //
    //     if (!message.rideId) {
    //         throw new ApplicationError(
    //             'Для создания чата требуется rideId',
    //             'VALIDATION_ERROR',
    //             400
    //         );
    //     }
    //
    //     // const ride = await this.#userRepository.findById(message.rideId);
    //     const { data } = await this.#rideClient.get(`/${message.rideId}`);
    //     return this.#chatService.createChat({
    //         rideId: message.rideId,
    //         driverId: data.driverId,
    //         passengerId: data.passengerId
    //     });
    // }

    async #verifyChatExists(chatId) {
        const chatExists = await this.#sequelizeModel.sequelize.models.Chat.findByPk(chatId);
        if (!chatExists) {
            throw new ApplicationError("Чат не найден", "CHAT_NOT_FOUND", 404);
        }
    }

    async #saveAttachments(messageId, attachments, transaction) {
        if (attachments?.length > 0) {
            await this.#attachmentRepository.saveAttachments(
                messageId,
                attachments,
                transaction
            );
        }
    }

    #buildWhereClause(criteria) {
        const where = {};

        if (criteria.id) where.id = criteria.id;
        if (criteria.senderId) where.sender_id = criteria.senderId;
        if (criteria.chatId) where.chat_id = criteria.chatId;
        if (criteria.status) where.status = criteria.status;

        if (criteria.searchText) {
            where.content = { [Op.like]: `%${criteria.searchText}%` };
        }

        if (criteria.startDate || criteria.endDate) {
            where.created_at = {};
            if (criteria.startDate) where.created_at[Op.gte] = new Date(criteria.startDate);
            if (criteria.endDate) where.created_at[Op.lte] = new Date(criteria.endDate);
        }

        return where;
    }

    #buildIncludeClause(criteria) {
        const include = [];

        if (criteria.includeAttachments) {
            include.push({
                model: this.#sequelizeModel.sequelize.models.Attachment,
                as: 'attachments'
            });
        }

        if (criteria.includeSender) {
            include.push({
                model: this.#sequelizeModel.sequelize.models.User,
                as: 'sender',
                attributes: ['id', 'username', 'email']
            });
        }

        return include;
    }

    #toDatabaseFormat(message) {
        return {
            id: message.id,
            content: message.text,
            status: message.status || 'sent',
            sender_id: message.senderId,
            receiver_id: message.receiverId,
            chat_id: message.chatId,
            edited_at: message.editedAt,
            metadata: message.metadata || {}
        };
    }

    #toDomainEntity(dbMessage) {
        return new MessageEntity({
            id: dbMessage.id,
            text: dbMessage.content,
            senderId: dbMessage.sender_id,
            receiverId: dbMessage.receiver_id,
            chatId: dbMessage.chat_id,
            status: dbMessage.status,
            attachments: dbMessage.attachments,
            createdAt: dbMessage.created_at,
            editedAt: dbMessage.edited_at,
            metadata: dbMessage.metadata
        });
    }

    async #invalidateCache(chatId) {
        const patterns = [
            `messages:chat:${chatId}:*`,
            `messages:criteria:*chatId:${chatId}*`
        ];

        await Promise.all(
            patterns.map(pattern =>
                this.#cacheService.deletePattern(pattern)
            )
        );
        logger.info(`Кэш очищен для чата: ${chatId}`);
    }

    async #findChatByRideId(rideId) {
        return this.#sequelizeModel.sequelize.models.Chat.findOne({
            where: { ride_id: rideId }
        });
    }

    #handleError(error, context) {
        if (error instanceof ApplicationError) return error;

        const isDatabaseError = error.name && error.name.includes('Sequelize');
        return new ApplicationError(
            `${context}: ${error.message}`,
            isDatabaseError ? 'DATABASE_ERROR' : 'UNKNOWN_ERROR',
            isDatabaseError ? 500 : 503
        );
    }
}