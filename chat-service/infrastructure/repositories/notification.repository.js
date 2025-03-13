// src/infrastructure/repositories/NotificationRepository.js
import { ApplicationError } from '../../application/exceptions/application.error.js';

export class NotificationRepository {
    #redisClient;
    #webSocketServer;

    constructor(redisClient, webSocketServer) {
        this.#redisClient = redisClient;
        this.#webSocketServer = webSocketServer;
    }

    async push(userId, notification) {
        try {
            // Сохраняем уведомление в Redis
            await this.#redisClient.lPush(
              `notifications:${userId}`,
              JSON.stringify(notification)
            );

            // Отправляем через WebSocket
            this.#webSocketServer.notifyUser(userId, 'new_notification', notification);

            // Устанавливаем TTL 7 дней
            await this.#redisClient.expire(`notifications:${userId}`, 604800);
        } catch (error) {
            throw new ApplicationError(
              'Failed to send notification',
              'NOTIFICATION_ERROR',
              500
            );
        }
    }

    async getHistory(userId, limit = 50) {
        try {
            const data = await this.#redisClient.lRange(
              `notifications:${userId}`,
              0,
              limit - 1
            );
            return data.map(JSON.parse);
        } catch (error) {
            throw new ApplicationError(
              'Failed to get notifications',
              'NOTIFICATION_ERROR',
              500
            );
        }
    }
}