import { ApplicationError } from '../exceptions/application.error.js';
import { CreateMessageDTO } from '../dtos/create-message.dto.js';
import logger from "../../infrastructure/config/logger.js";

export class ChatService {
    #messageRepository;
    #userRepository;
    #rideClient;
    #chatRepository;
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

    async createChat(params) {
        const { 
            type, 
            participantIds, 
            rideId = null, 
            metadata = {}, 
            systemMessage = true 
        } = params;
        
        const transaction = await this.#messageRepository.sequelize.transaction();
        
        try {
            // Проверка прав доступа в зависимости от типа чата
            this.#validateChatCreation(type, participantIds);
            
            // Для чатов по поездке проверяем существование поездки
            if (type === 'ride' && rideId) {
                const { data } = await this.#rideClient.get(`/${rideId}`);
                if (!data || !data.id) {
                    throw new Error(`Ride with id ${rideId} does not exist.`);
                }
            }
            
            // Создаем чат
            const chat = await this.#chatRepository.save({
                type,
                ride_id: rideId,
                participantIds,
                metadata
            }, { transaction });
            
            // Добавляем системное сообщение, если требуется
            if (systemMessage) {
                const messageText = this.#getSystemMessageByType(type);
                await this.#messageRepository.save({
                    content: messageText,
                    sender_id: 'system',
                    receiver_id: 'all',
                    chat_id: chat.id,
                    status: 'sent',
                    createdAt: new Date()
                }, { transaction });
            }
            
            await transaction.commit();
            return chat;
        } catch (error) {
            await transaction.rollback();
            throw this.#handleServiceError(error, `Ошибка создания чата типа ${type}`);
        }
    }

    /**
     * Получает историю чата
     * @param {Object} params - Параметры запроса
     * @param {string} [params.rideId] - ID поездки (для чатов поездки)
     * @param {string} [params.counterpartId] - ID собеседника
     * @param {string} params.userId - ID пользователя
     * @param {string} [params.chatId] - ID чата
     * @param {number} [params.limit=50] - Лимит сообщений
     * @param {number} [params.offset=0] - Смещение
     * @returns {Promise<Array>} - История сообщений
     */
    async getChatHistory(params) {
        try {
            const { rideId, counterpartId, userId, chatId, limit = 50, offset = 0 } = params;
            
            // Если передан ID чата, получаем сообщения по нему
            if (chatId) {
                const chat = await this.#chatRepository.findById(chatId);
                
                if (!chat) {
                    throw new ApplicationError('Chat not found', 'CHAT_NOT_FOUND', 404);
                }
                
                // Проверяем, что пользователь является участником чата
                if (!chat.participantIds.includes(userId)) {
                    throw new ApplicationError(
                        'You are not a participant of this chat',
                        'PERMISSION_DENIED',
                        403
                    );
                }
                
                const messages = await this.#messageRepository.findByCriteria({
                    chat_id: chatId,
                    deleted: false
                }, {
                    limit,
                    offset,
                    order: [['created_at', 'DESC']]
                });
                
                // Отмечаем все сообщения как прочитанные для текущего пользователя
                await this.#messageRepository.markAllAsRead(chatId, userId);
                
                return messages.data.map(this.#formatMessageResponse);
            }
            
            // Если передан ID поездки, получаем сообщения по поездке
            if (rideId) {
                const chat = await this.#chatRepository.findByRide(rideId);
                
                if (!chat) {
                    return []; // Возвращаем пустой массив, если чат не найден
                }
                
                // Проверяем, что пользователь является участником чата
                if (!chat.participantIds.includes(userId)) {
                    throw new ApplicationError(
                        'You are not a participant of this ride chat',
                        'PERMISSION_DENIED',
                        403
                    );
                }
                
                const messages = await this.#messageRepository.findByCriteria({
                    chat_id: chat.id,
                    deleted: false
                }, {
                    limit,
                    offset,
                    order: [['created_at', 'DESC']]
                });
                
                return messages.data.map(this.#formatMessageResponse);
            }
            
            // Если передан ID собеседника, получаем личные сообщения
            if (counterpartId) {
                const messages = await this.#messageRepository.findByCriteria({
                    $or: [
                        { sender_id: userId, receiver_id: counterpartId },
                        { sender_id: counterpartId, receiver_id: userId }
                    ],
                    deleted: false
                }, {
                    limit,
                    offset,
                    order: [['created_at', 'DESC']]
                });
                
                return messages.data.map(this.#formatMessageResponse);
            }
            
            throw new ApplicationError(
                'Missing required parameters (chatId, rideId or counterpartId)',
                'MISSING_PARAMETERS',
                400
            );
        } catch (error) {
            throw this.#handleServiceError(error, 'Failed to get chat history');
        }
    }

    async getMyChat(userId) {
        try {
            const chat = await this.#chatRepository.findByUser(userId);
            if (!chat) {
                throw new ApplicationError("Чат не найден", "NOT_FOUND", 404);
            }
            return chat;
        } catch (error) {
            throw this.#handleServiceError(error, 'Ошибка получения моего чата');
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

    async createDriverAdminChat({ driverId, adminId }) {
        const transaction = await this.#messageRepository.sequelize.transaction();

        try {
            const [driver, admin] = await Promise.all([
                this.#userRepository.findById(`driver:${driverId}`),
                this.#userRepository.findById(`admin:${adminId}`)
            ]);

            if (!driver || !admin) {
                throw new ApplicationError('Пользователь не найден', 'USER_NOT_FOUND', 404);
            }

            const chat = await this.#chatRepository.save({
                type: 'driver_admin',
                ride_id: null,
                participantIds: [driver.id, admin.id]
            }, { transaction });

            // Добавляем первое системное сообщение в чат
            await this.#messageRepository.save({
                content: "Чат между водителем и администратором создан",
                sender_id: 'system',
                receiver_id: 'all',
                chat_id: chat.id,
                status: 'sent',
                createdAt: new Date()
            }, { transaction });

            await transaction.commit();
            return chat;
        } catch (error) {
            await transaction.rollback();
            throw this.#handleServiceError(error, 'Ошибка создания чата водитель-админ');
        }
    }

    async getDriverAdminChats(userId) {
        return this.getChatsByType('driver_admin', userId);
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
        const chat = await this.#chatRepository.findById(message.chat_id);
        const chatType = chat ? chat.type : 'unknown';

        const payload = {
            id: message.id,
            senderId: message.sender_id,
            receiverId: message.receiver_id,
            chatId: message.chat_id,
            chatType: chatType,
            content: message.content,
            preview: message.content?.substring(0, 50) || '[File attachment]'
        };

        // Публикуем событие в RabbitMQ
        if (this.#eventPublisher.rabbit && typeof this.#eventPublisher.rabbit.publish === 'function') {
            await this.#eventPublisher.rabbit.publish('message_created', payload);
        }

        // Публикуем событие в Socket.IO
        if (this.#eventPublisher.socket && typeof this.#eventPublisher.socket.publish === 'function') {
            // Общее событие для всех типов сообщений
            await this.#eventPublisher.socket.publish('message_created', payload);
            
            // Специфическое событие для разных типов чатов
            if (chatType === 'driver_admin') {
                await this.#eventPublisher.socket.publish(
                    `driver_admin_chat_${message.chat_id}`, 
                    { type: 'new_message', data: payload }
                );
            } else if (chatType === 'ride') {
                await this.#eventPublisher.socket.publish(
                    `ride_${chat.ride_id}`, 
                    { type: 'new_message', data: payload }
                );
            }
        }
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

    /**
     * Получает текст системного сообщения в зависимости от типа чата
     * @private
     */
    #getSystemMessageByType(type) {
        const messages = {
            'ride': 'Чат поездки создан',
            'driver_admin': 'Чат между водителем и администратором создан',
            'support': 'Чат поддержки создан',
            'group': 'Групповой чат создан'
        };
        
        return messages[type] || 'Чат создан';
    }
    
    /**
     * Проверяет права на создание чата
     * @private
     */
    #validateChatCreation(type, participantIds) {
        // Проверка корректности типа чата
        const validTypes = ['ride', 'driver_admin', 'support', 'group', 'passenger_admin'];
        if (!validTypes.includes(type)) {
            throw new ApplicationError('Недопустимый тип чата', 'INVALID_CHAT_TYPE', 400);
        }
        
        // Проверка участников
        if (!participantIds || participantIds.length < 2) {
            throw new ApplicationError('Необходимо минимум 2 участника', 'INVALID_PARTICIPANTS', 400);
        }
        
        // Специфичные проверки для разных типов чатов
        if (type === 'ride') {
            const hasDriver = participantIds.some(id => id.startsWith('driver:'));
            const hasPassenger = participantIds.some(id => id.startsWith('passenger:'));
            
            if (!hasDriver || !hasPassenger) {
                throw new ApplicationError(
                    'Чат поездки должен включать водителя и пассажира', 
                    'INVALID_RIDE_PARTICIPANTS', 
                    400
                );
            }
        } else if (type === 'driver_admin') {
            const hasDriver = participantIds.some(id => id.startsWith('driver:'));
            const hasAdmin = participantIds.some(id => id.startsWith('admin:'));
            
            if (!hasDriver || !hasAdmin) {
                throw new ApplicationError(
                    'Чат должен включать водителя и администратора', 
                    'INVALID_DRIVER_ADMIN_PARTICIPANTS', 
                    400
                );
            }
        } else if (type === 'passenger_admin') {
            const hasPassenger = participantIds.some(id => id.startsWith('passenger:'));
            const hasAdmin = participantIds.some(id => id.startsWith('admin:'));
            
            if (!hasPassenger || !hasAdmin) {
                throw new ApplicationError(
                    'Чат должен включать пассажира и администратора', 
                    'INVALID_PASSENGER_ADMIN_PARTICIPANTS', 
                    400
                );
            }
        } else if (type === 'support') {
            const hasUser = participantIds.some(id => 
                id.startsWith('driver:') || id.startsWith('passenger:')
            );
            const hasAdmin = participantIds.some(id => id.startsWith('admin:'));
            
            if (!hasUser || !hasAdmin) {
                throw new ApplicationError(
                    'Чат поддержки должен включать пользователя и администратора', 
                    'INVALID_SUPPORT_PARTICIPANTS', 
                    400
                );
            }
        } else if (type === 'group') {
            // Для группового чата не нужны особые проверки,
            // кроме минимального количества участников
            if (participantIds.length < 2) {
                throw new ApplicationError(
                    'Групповой чат должен иметь как минимум 2 участников',
                    'INVALID_GROUP_PARTICIPANTS',
                    400
                );
            }
            
            // Проверка, что в групповом чате есть хотя бы один админ
            const hasAdmin = participantIds.some(id => id.startsWith('admin:'));
            if (!hasAdmin) {
                throw new ApplicationError(
                    'Групповой чат должен включать хотя бы одного администратора',
                    'INVALID_GROUP_PARTICIPANTS',
                    400
                );
            }
        }
    }

    /**
     * Получает чаты определенного типа для пользователя
     * @param {string} type - Тип чата
     * @param {string} userId - ID пользователя
     * @returns {Promise<Array>} - Список чатов
     */
    async getChatsByType(type, userId) {
        try {
            // Проверка корректности типа чата
            const validTypes = ['ride', 'driver_admin', 'support', 'group', 'passenger_admin'];
            if (!validTypes.includes(type)) {
                throw new ApplicationError('Недопустимый тип чата', 'INVALID_CHAT_TYPE', 400);
            }
            
            return await this.#chatRepository.findByType(type, userId);
        } catch (error) {
            throw this.#handleServiceError(error, `Failed to get ${type} chats`);
        }
    }

    /**
     * Отправляет сообщение в указанный чат или создает новый чат при необходимости
     * @param {Object} data - Данные сообщения
     * @returns {Promise<Object>} - Отправленное сообщение
     */
    sendMessage = async (data) => {
        try {
            const dto = new CreateMessageDTO(data);

            const [sender, receiver] = await Promise.all([
                this.#userRepository.findById(dto.senderId),
                this.#userRepository.findById(dto.receiverId),
            ]);
            if (!sender || !receiver) {
                throw new ApplicationError('Invalid participants', 'INVALID_PARTICIPANTS', 404);
            }

            let chat;
            // Проверяем тип чата на основе отправителя и получателя
            const senderType = dto.senderId.split(':')[0];
            const receiverType = dto.receiverId.split(':')[0];

            // Определяем тип чата
            let chatType;
            if ((senderType === 'driver' && receiverType === 'admin') || 
                (senderType === 'admin' && receiverType === 'driver')) {
                chatType = 'driver_admin';
            } else if ((senderType === 'passenger' && receiverType === 'admin') || 
                       (senderType === 'admin' && receiverType === 'passenger')) {
                chatType = 'passenger_admin';
            } else if ((senderType === 'passenger' && receiverType === 'driver') || 
                      (senderType === 'driver' && receiverType === 'passenger')) {
                if (!dto.rideId) {
                    throw new ApplicationError(
                        'Для чата между водителем и пассажиром необходимо указать ID поездки',
                        'MISSING_RIDE_ID',
                        400
                    );
                }
                chatType = 'ride';
            } else if (dto.chatId) {
                // Если указан chatId, проверяем его тип
                const existingChat = await this.#chatRepository.findById(dto.chatId);
                if (!existingChat) {
                    throw new ApplicationError('Chat not found', 'CHAT_NOT_FOUND', 404);
                }
                
                // Проверяем, является ли пользователь участником чата
                if (!existingChat.participantIds.includes(dto.senderId)) {
                    throw new ApplicationError(
                        'You are not a participant of this chat',
                        'PERMISSION_DENIED',
                        403
                    );
                }
                
                chat = existingChat;
                chatType = existingChat.type;
            } else {
                throw new ApplicationError(
                    'Invalid chat type or missing required parameters',
                    'INVALID_CHAT_PARAMETERS',
                    400
                );
            }
            
            // Если чат еще не определен, ищем существующий или создаем новый
            if (!chat) {
                if (chatType === 'driver_admin') {
                    // Поиск существующего чата между водителем и администратором
                    const driverId = senderType === 'driver' ? dto.senderId : dto.receiverId;
                    const adminId = senderType === 'admin' ? dto.senderId : dto.receiverId;
                    
                    // Ищем чат по типу и участникам
                    const driverAdminChats = await this.#chatRepository.findByType('driver_admin', driverId);
                    chat = driverAdminChats.find(c => 
                        c.participantIds.includes(driverId) && 
                        c.participantIds.includes(adminId)
                    );
                    
                    // Если чат не существует, создаем новый
                    if (!chat) {
                        chat = await this.createChat({
                            type: 'driver_admin',
                            participantIds: [driverId, adminId]
                        });
                    }
                } else if (chatType === 'passenger_admin') {
                    // Чат пассажира с администратором
                    const passengerId = senderType === 'passenger' ? dto.senderId : dto.receiverId;
                    const adminId = senderType === 'admin' ? dto.senderId : dto.receiverId;
                    
                    // Ищем чат по типу и участникам
                    const passengerAdminChats = await this.#chatRepository.findByType('passenger_admin', passengerId);
                    chat = passengerAdminChats.find(c => 
                        c.participantIds.includes(passengerId) && 
                        c.participantIds.includes(adminId)
                    );
                    
                    // Создаем новый чат при необходимости
                    if (!chat) {
                        chat = await this.createChat({
                            type: 'passenger_admin',
                            participantIds: [passengerId, adminId],
                            metadata: { 
                                rideId: dto.rideId
                            }
                        });
                    }
                } else if (chatType === 'ride') {
                    // Обычный чат, связанный с поездкой
                    chat = await this.#chatRepository.findByRide(dto.rideId);

                    if (!chat) {
                        chat = await this.createChat({
                            type: 'ride',
                            participantIds: [sender.id, receiver.id],
                            rideId: dto.rideId
                        });
                    }
                }
            }

            const messageData = {
                sender_id: dto.senderId,
                receiver_id: dto.receiverId,
                chat_id: chat.id,
                content: dto.text,
                status: 'sent',
                createdAt: new Date(),
                attachments: dto.attachments || []
            };

            const message = await this.#messageRepository.save(messageData);

            await this.#publishNewMessageEvent(message);

            return message;
        } catch (error) {
            throw this.#handleServiceError(error, 'Failed to send message');
        }
    };

    /**
     * Архивирует чат для пользователя
     * @param {string} chatId - ID чата
     * @param {string} userId - ID пользователя
     * @returns {Promise<boolean>} - Результат архивации
     */
    async archiveChat(chatId, userId) {
        try {
            // Проверяем, что пользователь является участником чата
            const chat = await this.#chatRepository.findById(chatId);
            
            if (!chat) {
                throw new ApplicationError('Chat not found', 'CHAT_NOT_FOUND', 404);
            }
            
            if (!chat.participantIds.includes(userId)) {
                throw new ApplicationError(
                    'You are not a participant of this chat',
                    'PERMISSION_DENIED',
                    403
                );
            }
            
            // Отмечаем чат как архивированный для пользователя
            await this.#chatRepository.updateParticipant(chatId, userId, { archived: true });
            
            // Публикуем событие
            await this.#publishChatArchivedEvent(chatId, userId);
            
            return true;
        } catch (error) {
            throw this.#handleServiceError(error, 'Failed to archive chat');
        }
    }
    
    /**
     * Удаляет сообщение
     * @param {string} messageId - ID сообщения
     * @param {string} userId - ID пользователя
     * @param {boolean} [forEveryone=false] - Удалить сообщение для всех участников
     * @returns {Promise<boolean>} - Результат удаления
     */
    async deleteMessage(messageId, userId, forEveryone = false) {
        try {
            const message = await this.#messageRepository.findById(messageId);
            
            if (!message) {
                throw new ApplicationError('Message not found', 'MESSAGE_NOT_FOUND', 404);
            }
            
            // Проверяем права на удаление
            if (forEveryone && message.sender_id !== userId) {
                throw new ApplicationError(
                    'Only the sender can delete a message for everyone',
                    'PERMISSION_DENIED',
                    403
                );
            }
            
            if (!forEveryone) {
                // Удаление сообщения только для себя
                await this.#messageRepository.markAsDeletedForUser(messageId, userId);
            } else {
                // Удаление сообщения для всех
                await this.#messageRepository.markAsDeleted(messageId);
                
                // Публикуем событие об удалении сообщения
                await this.#publishMessageDeletedEvent(message);
            }
            
            return true;
        } catch (error) {
            throw this.#handleServiceError(error, 'Failed to delete message');
        }
    }
    
    /**
     * Поиск сообщений по содержимому
     * @param {Object} params - Параметры поиска
     * @param {string} params.userId - ID пользователя
     * @param {string} [params.chatId] - ID чата
     * @param {string} params.query - Поисковый запрос
     * @param {Date} [params.dateFrom] - Начальная дата
     * @param {Date} [params.dateTo] - Конечная дата
     * @param {number} [params.limit=20] - Лимит результатов
     * @param {number} [params.offset=0] - Смещение
     * @returns {Promise<Object>} - Результаты поиска
     */
    async searchMessages(params) {
        try {
            const { userId, chatId, query, dateFrom, dateTo, limit = 20, offset = 0 } = params;
            
            // Проверяем, что пользователь имеет доступ к чату
            if (chatId) {
                const chat = await this.#chatRepository.findById(chatId);
                
                if (!chat) {
                    throw new ApplicationError('Chat not found', 'CHAT_NOT_FOUND', 404);
                }
                
                if (!chat.participantIds.includes(userId)) {
                    throw new ApplicationError(
                        'You are not a participant of this chat',
                        'PERMISSION_DENIED',
                        403
                    );
                }
            }
            
            // Подготавливаем критерии поиска
            const criteria = {
                content: { [Op.like]: `%${query}%` },
                deleted: false
            };
            
            if (chatId) {
                criteria.chat_id = chatId;
            } else {
                // Если чат не указан, ищем среди всех чатов пользователя
                criteria[Op.or] = [
                    { sender_id: userId },
                    { receiver_id: userId }
                ];
            }
            
            if (dateFrom || dateTo) {
                criteria.created_at = {};
                
                if (dateFrom) {
                    criteria.created_at[Op.gte] = new Date(dateFrom);
                }
                
                if (dateTo) {
                    criteria.created_at[Op.lte] = new Date(dateTo);
                }
            }
            
            // Выполняем поиск
            const results = await this.#messageRepository.findByCriteria(criteria, {
                limit,
                offset,
                order: [['created_at', 'DESC']]
            });
            
            // Группируем результаты по чатам
            const groupedResults = this.#groupMessagesByChat(results.data);
            
            return {
                total: results.total,
                limit,
                offset,
                query,
                results: groupedResults
            };
        } catch (error) {
            throw this.#handleServiceError(error, 'Failed to search messages');
        }
    }
    
    /**
     * Группирует сообщения по чатам
     * @private
     */
    #groupMessagesByChat(messages) {
        const chatMap = {};
        
        for (const message of messages) {
            if (!chatMap[message.chat_id]) {
                chatMap[message.chat_id] = [];
            }
            
            chatMap[message.chat_id].push(this.#formatMessageResponse(message));
        }
        
        return Object.keys(chatMap).map(chatId => ({
            chatId,
            messages: chatMap[chatId]
        }));
    }
    
    /**
     * Публикует событие об архивации чата
     * @private
     */
    async #publishChatArchivedEvent(chatId, userId) {
        const payload = {
            chatId,
            userId,
            timestamp: new Date()
        };
        
        if (this.#eventPublisher.rabbit) {
            await this.#eventPublisher.rabbit.publish('chat_archived', payload);
        }
        
        if (this.#eventPublisher.socket) {
            await this.#eventPublisher.socket.publishToUser(userId, 'chat_archived', payload);
        }
    }
    
    /**
     * Публикует событие об удалении сообщения
     * @private
     */
    async #publishMessageDeletedEvent(message) {
        const payload = {
            messageId: message.id,
            chatId: message.chat_id,
            senderId: message.sender_id,
            timestamp: new Date()
        };
        
        if (this.#eventPublisher.rabbit) {
            await this.#eventPublisher.rabbit.publish('message_deleted', payload);
        }
        
        if (this.#eventPublisher.socket) {
            await this.#eventPublisher.socket.publish(`chat_${message.chat_id}`, {
                type: 'message_deleted',
                data: payload
            });
        }
    }

    /**
     * Получает чат по ID
     * @param {string} chatId - ID чата
     * @returns {Promise<Object|null>} - Информация о чате
     */
    async getChatById(chatId) {
        try {
            return await this.#chatRepository.findById(chatId);
        } catch (error) {
            throw this.#handleServiceError(error, 'Failed to get chat by ID');
        }
    }

    /**
     * Отмечает сообщение как прочитанное
     * @param {string} messageId - ID сообщения
     * @param {string} userId - ID пользователя
     * @returns {Promise<Object>} - Обновленное сообщение
     */
    async markMessageAsRead(messageId, userId) {
        try {
            const message = await this.#messageRepository.findById(messageId);
            
            if (!message) {
                throw new ApplicationError('Message not found', 'MESSAGE_NOT_FOUND', 404);
            }
            
            // Проверяем, является ли пользователь получателем сообщения
            if (message.receiver_id !== userId) {
                throw new ApplicationError(
                    'Only receiver can mark message as read',
                    'PERMISSION_DENIED',
                    403
                );
            }
            
            const updatedMessage = await this.#messageRepository.markAsRead(messageId);
            
            // Публикуем событие о прочтении
            await this.#publishMessageReadEvent(updatedMessage);
            
            return updatedMessage;
        } catch (error) {
            throw this.#handleServiceError(error, 'Failed to mark message as read');
        }
    }
    
    /**
     * Отмечает все сообщения в чате как прочитанные
     * @param {string} chatId - ID чата
     * @param {string} userId - ID пользователя
     * @returns {Promise<number>} - Количество обновленных сообщений
     */
    async markAllMessagesAsRead(chatId, userId) {
        try {
            // Проверяем, что пользователь является участником чата
            const chat = await this.#chatRepository.findById(chatId);
            
            if (!chat) {
                throw new ApplicationError('Chat not found', 'CHAT_NOT_FOUND', 404);
            }
            
            if (!chat.participantIds.includes(userId)) {
                throw new ApplicationError(
                    'You are not a participant of this chat',
                    'PERMISSION_DENIED',
                    403
                );
            }
            
            const count = await this.#messageRepository.markAllAsRead(chatId, userId);
            
            // Публикуем событие о прочтении всех сообщений
            await this.#publishAllMessagesReadEvent(chatId, userId);
            
            return count;
        } catch (error) {
            throw this.#handleServiceError(error, 'Failed to mark all messages as read');
        }
    }
    
    /**
     * Публикует событие о прочтении сообщения
     * @private
     */
    async #publishMessageReadEvent(message) {
        const payload = {
            messageId: message.id,
            senderId: message.sender_id,
            receiverId: message.receiver_id,
            chatId: message.chat_id,
            timestamp: new Date()
        };
        
        if (this.#eventPublisher.rabbit) {
            await this.#eventPublisher.rabbit.publish('message_read', payload);
        }
        
        if (this.#eventPublisher.socket) {
            // Отправляем уведомление отправителю
            await this.#eventPublisher.socket.publishToUser(message.sender_id, 'message_read', payload);
            
            // Отправляем уведомление в канал чата
            const chat = await this.#chatRepository.findById(message.chat_id);
            const eventName = chat.type === 'ride' 
                ? `ride_${chat.ride_id}` 
                : `${chat.type}_chat_${chat.id}`;
                
            await this.#eventPublisher.socket.publish(eventName, {
                type: 'message_read',
                data: payload
            });
        }
    }
    
    /**
     * Публикует событие о прочтении всех сообщений в чате
     * @private
     */
    async #publishAllMessagesReadEvent(chatId, userId) {
        const chat = await this.#chatRepository.findById(chatId);
        
        const payload = {
            chatId,
            userId,
            timestamp: new Date()
        };
        
        if (this.#eventPublisher.rabbit) {
            await this.#eventPublisher.rabbit.publish('all_messages_read', payload);
        }
        
        if (this.#eventPublisher.socket) {
            const eventName = chat.type === 'ride' 
                ? `ride_${chat.ride_id}` 
                : `${chat.type}_chat_${chat.id}`;
                
            await this.#eventPublisher.socket.publish(eventName, {
                type: 'all_messages_read',
                data: payload
            });
        }
    }
}
