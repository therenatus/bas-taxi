// src/infrastructure/repositories/UserRepository.js
import { ApplicationError } from '../../application/exceptions/application.error.js';
import { UserEntity } from '../../domain/entities/user.entity.js';

export class UserRepository {
    #httpClient;
    #cache;

    constructor(httpClient) {
        this.#httpClient = httpClient;
        this.#cache = new Map();
    }

    async findById(userId) {
        try {
            if (this.#cache.has(userId)) {
                return this.#cache.get(userId);
            }

            const response = await this.#httpClient.get(`/users/${userId}`);
            const user = UserEntity.createFromAuthServiceDTO(response.data);

            this.#cache.set(userId, user);
            return user;
        } catch (error) {
            if (error.response?.status === 404) {
                throw new ApplicationError('User not found', 'USER_NOT_FOUND', 404);
            }
            throw new ApplicationError(
              'Auth service unavailable',
              'AUTH_SERVICE_ERROR',
              503
            );
        }
    }

    async findByCriteria(criteria) {
        try {
            const response = await this.#httpClient.post('/users/search', criteria);
            return response.data.map(UserEntity.createFromAuthServiceDTO);
        } catch (error) {
            throw new ApplicationError(
              'User search failed',
              'AUTH_SERVICE_ERROR',
              503
            );
        }
    }

    async verifyAccessToken(token) {
        try {
            const response = await this.#httpClient.post('/auth/verify', { token });
            return UserEntity.createFromAuthServiceDTO(response.data);
        } catch (error) {
            throw new ApplicationError(
              'Invalid access token',
              'INVALID_TOKEN',
              401
            );
        }
    }
}