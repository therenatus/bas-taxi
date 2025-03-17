export class ParticipantRepository {
    #sequelizeModel;

    constructor(sequelizeModel) {
        this.#sequelizeModel = sequelizeModel;
    }

    async findByChatId(chatId) {
        return this.#sequelizeModel.findAll({
            where: { 'chat_id': chatId } // Используем имя столбца из базы
        });
    }

    async syncParticipants(chatId, participantIds, transaction) {
        // Удаляем существующих участников для данного чата
        await this.#sequelizeModel.destroy({
            where: { chat_id: chatId },
            transaction
        });
        // Создаем новые записи участников
        const participants = participantIds.map(userId => ({
            chat_id: chatId,
            user_id: userId
        }));
        await this.#sequelizeModel.bulkCreate(participants, { transaction });
    }
}
