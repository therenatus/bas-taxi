import { ApplicationError } from "../../application/exceptions/application.error.js";
import logger from "../config/logger.js";
import { Op } from "sequelize";

export class AttachmentRepository {
    #sequelizeModel;
    #messageModel;

    constructor(sequelizeModel, messageModel) {
        this.#sequelizeModel = sequelizeModel;
        this.#messageModel = messageModel;
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
     * Находит вложения для чата
     * @param {string} chatId - ID чата
     * @param {Object} filter - Параметры фильтрации
     * @returns {Promise<Array>} - Массив вложений
     */
    async findByChat(chatId, filter = {}) {
        try {
            const { limit = 20, offset = 0, type, startDate, endDate } = filter;
            
            const whereClause = {
                '$message.chat_id$': chatId
            };
            
            if (type) {
                whereClause.mime_type = type;
            }
            
            if (startDate || endDate) {
                whereClause.created_at = {};
                
                if (startDate) {
                    whereClause.created_at[Op.gte] = new Date(startDate);
                }
                
                if (endDate) {
                    whereClause.created_at[Op.lte] = new Date(endDate);
                }
            }
            
            const attachments = await this.#sequelizeModel.findAll({
                where: whereClause,
                include: [{
                    model: this.#messageModel,
                    as: 'message',
                    attributes: []
                }],
                limit,
                offset,
                order: [['created_at', 'DESC']]
            });
            
            return attachments.map(attachment => this.#toDomainEntity(attachment));
        } catch (error) {
            throw new Error(`Failed to find attachments by chat: ${error.message}`);
        }
    }
    
    /**
     * Находит вложение по ID
     * @param {string} id - ID вложения
     * @returns {Promise<Object|null>} - Вложение или null
     */
    async findById(id) {
        try {
            const attachment = await this.#sequelizeModel.findByPk(id);
            return attachment ? this.#toDomainEntity(attachment) : null;
        } catch (error) {
            throw new Error(`Failed to find attachment by ID: ${error.message}`);
        }
    }
    
    /**
     * Удаляет вложение
     * @param {string} id - ID вложения
     * @returns {Promise<boolean>} - Результат удаления
     */
    async delete(id) {
        try {
            const deleted = await this.#sequelizeModel.destroy({
                where: { id }
            });
            
            return deleted > 0;
        } catch (error) {
            throw new Error(`Failed to delete attachment: ${error.message}`);
        }
    }
    
    /**
     * Создает новое вложение
     * @param {Object} data - Данные вложения
     * @returns {Promise<Object>} - Созданное вложение
     */
    async save(data) {
        try {
            const attachment = await this.#sequelizeModel.create(data);
            return this.#toDomainEntity(attachment);
        } catch (error) {
            throw new Error(`Failed to save attachment: ${error.message}`);
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