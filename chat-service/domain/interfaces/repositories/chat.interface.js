export class IChatRepository {
    async findOrCreate(participant1Id, participant2Id, rideId) { throw new Error('Not implemented'); }
    async save(chat) { throw new Error('Method not implemented'); }
    async findById(chatId) { throw new Error('Method not implemented'); }
    async findByRide(rideId) { throw new Error('Method not implemented'); }
    async findByParticipants(participantIds) { throw new Error('Method not implemented'); }
}