export class IUserRepository {
    async findById(id) { throw new Error('Not implemented'); }
    async findByRole(role) { throw new Error('Not implemented'); }
    async save(user) { throw new Error('Not implemented'); }
    async verifyAccessToken(token) { throw new Error('Method not implemented'); }
    async findByCriteria(criteria) { throw new Error('Method not implemented'); }
}