import { ApplicationError } from "../../application/exceptions/application.error.js";
import logger from "../config/logger.js";

export class AttachmentRepository {
    #sequelizeModel;

    constructor(sequelizeModel) {
        this.#sequelizeModel = sequelizeModel;
    }

    /**
     * Сохраняет вложения для сообщения.
     * @param {string} messageId - ID сообщения.
     * @param {Array<Object>} attachments - Массив вложений.
     * @param {Object} transaction - Транзакция Sequelize.
     * @returns {Promise<void>}
     */
    async saveAttachments(messageId, attachments, transaction) {
        if (!attachments || attachments.length === 0) return;

        try {
            const attachmentsToSave = attachments.map(attachment => ({
                message_id: messageId,
                file_url: attachment.url,
                file_type: attachment.type,
                file_name: attachment.name,
                metadata: attachment.metadata || {}
            }));

            await this.#sequelizeModel.bulkCreate(attachmentsToSave, { transaction });
            logger.info(`Вложения сохранены для сообщения: ${messageId}`);
        } catch (error) {
            logger.error(`Ошибка сохранения вложений: ${error.message}`);
            throw this.#handleError(error, 'Ошибка сохранения вложений');
        }
    }

    /**
     * Находит вложения по ID сообщения.
     * @param {string} messageId - ID сообщения.
     * @returns {Promise<Array<Object>>} - Массив вложений.
     */
    async findByMessageId(messageId) {
        try {
            const attachments = await this.#sequelizeModel.findAll({
                where: { message_id: messageId }
            });

            return attachments.map(this.#toDomainEntity);
        } catch (error) {
            logger.error(`Ошибка поиска вложений: ${error.message}`);
            throw this.#handleError(error, 'Ошибка поиска вложений');
        }
    }

    /**
     * Удаляет вложения по ID сообщения.
     * @param {string} messageId - ID сообщения.
     * @param {Object} transaction - Транзакция Sequelize.
     * @returns {Promise<void>}
     */
    async deleteByMessageId(messageId, transaction) {
        try {
            await this.#sequelizeModel.destroy({
                where: { message_id: messageId },
                transaction
            });
            logger.info(`Вложения удалены для сообщения: ${messageId}`);
        } catch (error) {
            logger.error(`Ошибка удаления вложений: ${error.message}`);
            throw this.#handleError(error, 'Ошибка удаления вложений');
        }
    }

    /**
     * Преобразует объект базы данных в доменную сущность.
     * @param {Object} dbAttachment - Объект из базы данных.
     * @returns {Object} - Доменная сущность.
     */
    #toDomainEntity(dbAttachment) {
        return {
            id: dbAttachment.id,
            messageId: dbAttachment.message_id,
            url: dbAttachment.file_url,
            type: dbAttachment.file_type,
            name: dbAttachment.file_name,
            metadata: dbAttachment.metadata,
            createdAt: dbAttachment.created_at,
            updatedAt: dbAttachment.updated_at
        };
    }

    /**
     * Обрабатывает ошибки.
     * @param {Error} error - Ошибка.
     * @param {string} context - Контекст ошибки.
     * @returns {ApplicationError}
     */
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