// src/infrastructure/repositories/ChatRepository.js
import { ChatEntity } from '../../domain/entities/chat.entity.js';
import { ApplicationError } from '../../application/exceptions/application.error.js';

export class ChatRepository {
    #sequelizeModel;
    #participantRepository;

    constructor(sequelizeModel, participantRepository) {
        this.#sequelizeModel = sequelizeModel;
        this.#participantRepository = participantRepository;
    }

    async save(chat) {
        const transaction = await this.#sequelizeModel.sequelize.transaction();

        try {
            const [dbChat] = await this.#sequelizeModel.upsert(
              this.#toDatabaseFormat(chat),
              { transaction }
            );

            await this.#participantRepository.syncParticipants(
              dbChat.id,
              chat.participantIds,
              transaction
            );

            await transaction.commit();
            return this.#toDomainEntity(dbChat);
        } catch (error) {
            await transaction.rollback();
            throw new ApplicationError(
              'Failed to save chat',
              'DATABASE_ERROR',
              500
            );
        }
    }

    async findById(chatId) {
        try {
            const dbChat = await this.#sequelizeModel.findByPk(chatId, {
                include: ['participants', 'messages']
            });
            return dbChat ? this.#toDomainEntity(dbChat) : null;
        } catch (error) {
            throw new ApplicationError(
              'Failed to fetch chat',
              'DATABASE_ERROR',
              500
            );
        }
    }

    #toDatabaseFormat(chat) {
        return {
            id: chat.id,
            rideId: chat.rideId,
            status: chat.status,
            lastActivity: chat.lastActivity
        };
    }

    #toDomainEntity(dbChat) {
        return new ChatEntity({
            id: dbChat.id,
            participants: dbChat.participants,
            rideId: dbChat.rideId,
            messages: dbChat.messages,
            status: dbChat.status,
            createdAt: dbChat.createdAt,
            lastActivity: dbChat.lastActivity
        });
    }
}