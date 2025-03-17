export class ParticipantRepository {
    #sequelizeModel;

    constructor(sequelizeModel) {
        this.#sequelizeModel = sequelizeModel;
    }

    async findByChatId(chatId) {
        return this.#sequelizeModel.findAll({
            where: { 'chat_id': chatId }
        });
    }

    async syncParticipants(chatId, participantIds, transaction) {
        await this.#sequelizeModel.destroy({
            where: { chat_id: chatId },
            transaction
        });
        const participants = participantIds.map(userId => ({
            chat_id: chatId,
            user_id: userId
        }));
        await this.#sequelizeModel.bulkCreate(participants, { transaction });
    }
}
