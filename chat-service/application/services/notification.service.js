import {ApplicationError} from "../exceptions/application.error.js";

export class NotificationService {
    #adapter;
    #logger;

    constructor({ adapter, logger = console }) {
        this.#adapter = adapter;
        this.#logger = logger;
    }

    notifyNewMessage = async (message) => {
        try {
            await this.#adapter.send({
                type: 'chat_message',
                recipientId: message.receiverId,
                payload: {
                    messageId: message.id,
                    sender: message.senderId,
                    preview: message.text?.substring(0, 50) || 'New file',
                    timestamp: message.createdAt
                }
            });
        } catch (error) {
            this.#logger.error('Notification failed:', error);
            throw new ApplicationError('Failed to send notification', 'NOTIFICATION_ERROR', 500);
        }
    };

    notifyChatArchived = async (rideId, userIds) => {
        await Promise.allSettled(
            userIds.map(id =>
                this.#adapter.send({
                    type: 'chat_archived',
                    recipientId: id,
                    payload: { rideId }
                })
            )
        );
    };
}