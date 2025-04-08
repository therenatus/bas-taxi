import {ApplicationError} from "../exceptions/application.error.js";

export class NotificationService {
    #messageRepository;
    #eventPublisher;
    #userRepository;

    constructor({ messageRepository, eventPublisher, userRepository }) {
        this.#messageRepository = messageRepository;
        this.#eventPublisher = eventPublisher;
        this.#userRepository = userRepository;
    }

    /**
     * Получает количество непрочитанных сообщений для пользователя
     * @param {string} userId - ID пользователя
     * @returns {Promise<number>} - Количество непрочитанных сообщений
     */
    async getUnreadMessagesCount(userId) {
        try {
            return await this.#messageRepository.getUnreadCount(userId);
        } catch (error) {
            throw this.#handleServiceError(error, 'Failed to get unread message count');
        }
    }

    /**
     * Получает количество непрочитанных сообщений по чатам для пользователя
     * @param {string} userId - ID пользователя
     * @returns {Promise<Object>} - Объект с количеством непрочитанных сообщений по чатам
     */
    async getUnreadMessagesByChat(userId) {
        try {
            return await this.#messageRepository.getUnreadCountByChat(userId);
        } catch (error) {
            throw this.#handleServiceError(error, 'Failed to get unread messages by chat');
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
                throw new ApplicationError('Message not found', 'NOT_FOUND', 404);
            }
            
            // Проверяем, является ли пользователь получателем сообщения
            if (message.receiver_id !== userId) {
                throw new ApplicationError('Permission denied', 'PERMISSION_DENIED', 403);
            }
            
            const updatedMessage = await this.#messageRepository.markAsRead(messageId);
            
            // Публикуем событие о прочтении сообщения
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
            const updatedCount = await this.#messageRepository.markAllAsRead(chatId, userId);
            
            // Публикуем событие о прочтении всех сообщений в чате
            await this.#publishAllMessagesReadEvent(chatId, userId);
            
            return updatedCount;
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
            readAt: message.read_at
        };
        
        if (this.#eventPublisher.rabbit) {
            await this.#eventPublisher.rabbit.publish('message_read', payload);
        }
        
        if (this.#eventPublisher.socket) {
            await this.#eventPublisher.socket.publish('message_read', payload);
            
            // Отправляем уведомление отправителю о прочтении
            await this.#eventPublisher.socket.publishToUser(message.sender_id, 'message_read', payload);
        }
    }

    /**
     * Публикует событие о прочтении всех сообщений в чате
     * @private
     */
    async #publishAllMessagesReadEvent(chatId, userId) {
        const payload = {
            chatId,
            userId,
            timestamp: new Date()
        };
        
        if (this.#eventPublisher.rabbit) {
            await this.#eventPublisher.rabbit.publish('all_messages_read', payload);
        }
        
        if (this.#eventPublisher.socket) {
            await this.#eventPublisher.socket.publish(`chat_${chatId}`, {
                type: 'all_messages_read',
                data: payload
            });
        }
    }

    /**
     * Обрабатывает ошибку сервиса
     * @private
     */
    #handleServiceError(error, context) {
        if (error instanceof ApplicationError) return error;
        
        return new ApplicationError(
            `${context}: ${error.message}`,
            'NOTIFICATION_SERVICE_ERROR',
            500
        );
    }
}