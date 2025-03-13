// src/infrastructure/repositories/MessageRepository.js
import { MessageEntity } from '../../domain/entities/message.entity.js';
import { ApplicationError } from '../../application/exceptions/application.error.js';

export class MessageRepository {
    #sequelizeModel;
    #attachmentRepository;

    constructor(sequelizeModel, attachmentRepository) {
        this.#sequelizeModel = sequelizeModel;
        this.#attachmentRepository = attachmentRepository;
    }

    async save(message) {
        const transaction = await this.#sequelizeModel.sequelize.transaction();

        try {
            const dbMessage = await this.#sequelizeModel.create(
              this.#toDatabaseFormat(message),
              { transaction }
            );

            await this.#attachmentRepository.saveAttachments(
              dbMessage.id,
              message.attachments,
              transaction
            );

            await transaction.commit();
            return this.#toDomainEntity(dbMessage);
        } catch (error) {
            await transaction.rollback();
            throw new ApplicationError(
              'Failed to save message',
              'DATABASE_ERROR',
              500
            );
        }
    }

    async findByChatId(chatId, pagination) {
        try {
            const result = await this.#sequelizeModel.findAndCountAll({
                where: { chatId },
                include: ['attachments'],
                limit: pagination.pageSize,
                offset: (pagination.page - 1) * pagination.pageSize,
                order: [['createdAt', 'DESC']]
            });

            return {
                data: result.rows.map(this.#toDomainEntity),
                total: result.count
            };
        } catch (error) {
            throw new ApplicationError(
              'Failed to fetch messages',
              'DATABASE_ERROR',
              500
            );
        }
    }

    #toDatabaseFormat(message) {
        return {
            id: message.id,
            content: message.content,
            status: message.status,
            senderId: message.senderId,
            chatId: message.chatId,
            editedAt: message.editedAt
        };
    }

    #toDomainEntity(dbMessage) {
        return new MessageEntity({
            id: dbMessage.id,
            content: dbMessage.content,
            senderId: dbMessage.senderId,
            chatId: dbMessage.chatId,
            status: dbMessage.status,
            attachments: dbMessage.attachments,
            createdAt: dbMessage.createdAt,
            editedAt: dbMessage.editedAt
        });
    }
}