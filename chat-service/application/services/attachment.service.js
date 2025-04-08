import { ApplicationError } from '../exceptions/application.error.js';
import path from 'path';
import crypto from 'crypto';

/**
 * Сервис для управления вложениями сообщений
 */
export class AttachmentService {
    #fileStorage;
    #attachmentRepository;
    #messageRepository;
    
    // Максимальный размер файла в байтах (10MB)
    #MAX_FILE_SIZE = 10 * 1024 * 1024;
    
    // Разрешенные типы файлов
    #ALLOWED_MIME_TYPES = [
        // Изображения
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        
        // Документы
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        
        // Текстовые файлы
        'text/plain',
        'text/csv',
        
        // Архивы
        'application/zip',
        'application/x-rar-compressed'
    ];
    
    constructor({ fileStorage, attachmentRepository, messageRepository }) {
        this.#fileStorage = fileStorage;
        this.#attachmentRepository = attachmentRepository;
        this.#messageRepository = messageRepository;
    }
    
    /**
     * Загружает вложение для сообщения
     * @param {Object} params - Параметры загрузки
     * @param {Buffer} params.file - Буфер файла
     * @param {string} params.fileName - Имя файла
     * @param {string} params.mimeType - MIME-тип файла
     * @param {string} params.messageId - ID сообщения
     * @param {string} params.userId - ID пользователя
     * @returns {Promise<Object>} - Информация о загруженном вложении
     */
    async uploadAttachment({ file, fileName, mimeType, messageId, userId }) {
        try {
            // Проверка размера файла
            if (file.length > this.#MAX_FILE_SIZE) {
                throw new ApplicationError(
                    `File size exceeds the limit of ${this.#MAX_FILE_SIZE / (1024 * 1024)}MB`,
                    'FILE_TOO_LARGE',
                    400
                );
            }
            
            // Проверка типа файла
            if (!this.#ALLOWED_MIME_TYPES.includes(mimeType)) {
                throw new ApplicationError(
                    'File type not allowed',
                    'INVALID_FILE_TYPE',
                    400
                );
            }
            
            // Если передан ID сообщения, проверяем права на добавление вложения
            if (messageId) {
                const message = await this.#messageRepository.findById(messageId);
                
                if (!message) {
                    throw new ApplicationError('Message not found', 'NOT_FOUND', 404);
                }
                
                if (message.sender_id !== userId) {
                    throw new ApplicationError(
                        'Only the sender can add attachments',
                        'PERMISSION_DENIED',
                        403
                    );
                }
            }
            
            // Генерируем уникальное имя файла
            const fileExtension = path.extname(fileName);
            const uniqueFileName = `${crypto.randomUUID()}${fileExtension}`;
            
            // Загружаем файл в хранилище
            const fileUrl = await this.#fileStorage.upload({
                buffer: file,
                fileName: uniqueFileName,
                mimeType
            });
            
            // Создаем запись о вложении
            const attachment = await this.#attachmentRepository.save({
                original_name: fileName,
                file_name: uniqueFileName,
                mime_type: mimeType,
                size: file.length,
                url: fileUrl,
                message_id: messageId || null,
                uploaded_by: userId
            });
            
            return attachment;
        } catch (error) {
            throw this.#handleServiceError(error, 'Failed to upload attachment');
        }
    }
    
    /**
     * Получает вложения сообщения
     * @param {string} messageId - ID сообщения
     * @returns {Promise<Array>} - Массив вложений
     */
    async getMessageAttachments(messageId) {
        try {
            return await this.#attachmentRepository.findByMessage(messageId);
        } catch (error) {
            throw this.#handleServiceError(error, 'Failed to get message attachments');
        }
    }
    
    /**
     * Получает вложения чата
     * @param {string} chatId - ID чата
     * @param {Object} [filter] - Параметры фильтрации
     * @returns {Promise<Array>} - Массив вложений
     */
    async getChatAttachments(chatId, filter = {}) {
        try {
            return await this.#attachmentRepository.findByChat(chatId, filter);
        } catch (error) {
            throw this.#handleServiceError(error, 'Failed to get chat attachments');
        }
    }
    
    /**
     * Удаляет вложение
     * @param {string} attachmentId - ID вложения
     * @param {string} userId - ID пользователя
     * @returns {Promise<boolean>} - Результат удаления
     */
    async deleteAttachment(attachmentId, userId) {
        try {
            const attachment = await this.#attachmentRepository.findById(attachmentId);
            
            if (!attachment) {
                throw new ApplicationError('Attachment not found', 'NOT_FOUND', 404);
            }
            
            // Проверяем, что пользователь является загрузившим вложение
            if (attachment.uploaded_by !== userId) {
                throw new ApplicationError(
                    'Permission denied',
                    'PERMISSION_DENIED',
                    403
                );
            }
            
            // Если вложение привязано к сообщению, проверяем права
            if (attachment.message_id) {
                const message = await this.#messageRepository.findById(attachment.message_id);
                
                if (message && message.sender_id !== userId) {
                    throw new ApplicationError(
                        'Only the sender can delete attachments',
                        'PERMISSION_DENIED',
                        403
                    );
                }
            }
            
            // Удаляем файл из хранилища
            await this.#fileStorage.delete(attachment.file_name);
            
            // Удаляем запись из базы данных
            await this.#attachmentRepository.delete(attachmentId);
            
            return true;
        } catch (error) {
            throw this.#handleServiceError(error, 'Failed to delete attachment');
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
            'ATTACHMENT_SERVICE_ERROR',
            500
        );
    }
} 