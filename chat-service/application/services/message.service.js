import { ApplicationError } from '../exceptions/application.error.js';
import { CreateMessageDTO } from '../dtos/create-message.dto.js';

export class ChatService {
    #messageRepository;
    #userRepository;
    #fileStorage;
    #eventPublisher;

    constructor({ messageRepository, userRepository, fileStorage, eventPublisher }) {
        this.#messageRepository = messageRepository;
        this.#userRepository = userRepository;
        this.#fileStorage = fileStorage;
        this.#eventPublisher = eventPublisher;
    }

    sendMessage = async (data) => {
        try {
            const dto = new CreateMessageDTO(data);
            const [sender, receiver] = await Promise.all([
                this.#userRepository.findById(dto.senderId),
                this.#userRepository.findById(dto.receiverId)
            ]);

            if (!sender || !receiver) {
                throw new ApplicationError('Invalid participants', 'INVALID_PARTICIPANTS', 404);
            }

            const messageData = {
                ...dto,
                imageUrl: dto.file ? await this.#uploadFile(dto.file) : null,
                createdAt: new Date()
            };

            const message = await this.#messageRepository.create(messageData);
            await this.#publishNewMessageEvent(message);

            return message;
        } catch (error) {
            throw this.#handleServiceError(error, 'Failed to send message');
        }
    };

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
        await this.#eventPublisher.publish('message_created', {
            id: message.id,
            senderId: message.senderId,
            receiverId: message.receiverId,
            preview: message.text?.substring(0, 50) || '[File attachment]'
        });
    };

    #handleServiceError = (error, context) => {
        if (error instanceof ApplicationError) return error;
        return new ApplicationError(
            `${context}: ${error.message}`,
            'SERVICE_ERROR',
            500
        );
    };
}