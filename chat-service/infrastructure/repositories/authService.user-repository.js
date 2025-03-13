import { User } from "../../domain/value-objects/user.js";
import { ApplicationError } from "../../application/exceptions/application.error.js";

export class AuthServiceUserRepository {
    #authServiceClient;
    #cache;

    constructor(authServiceClient) {
        this.#authServiceClient = authServiceClient;
        this.#cache = new Map();
    }

    async findById(userId) {
        if (this.#cache.has(userId)) {
            return this.#cache.get(userId);
        }

        try {
            const response = await this.#authServiceClient.get(`/users/${userId}`);
            const user = User.createFromAuthServiceDTO(response.data);
            this.#cache.set(userId, user);
            return user;
        } catch (error) {
            throw new ApplicationError('User not found', 'USER_NOT_FOUND', 404);
        }
    }

    async verifyAccessToken(token) {
        try {
            const response = await this.#authServiceClient.post('/auth/verify', { token });
            return User.createFromAuthServiceDTO(response.data);
        } catch (error) {
            throw new ApplicationError('Invalid token', 'INVALID_TOKEN', 401);
        }
    }
}