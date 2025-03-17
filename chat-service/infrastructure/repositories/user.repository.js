import { ApplicationError } from '../../application/exceptions/application.error.js';
import { UserEntity } from '../../domain/entities/user.entity.js';
import logger from "../config/logger.js";

export class UserRepository {
    #driverClient;
    #passengerClient;
    #adminClient;
    #cache;
    #timeout;

    constructor({ driverClient, passengerClient, adminClient }) {
        this.#driverClient = driverClient;
        this.#passengerClient = passengerClient;
        this.#adminClient = adminClient;
        this.#cache = new Map();
        this.#timeout = 10000;
    }

    async findById(compositeId) {
        try {
            if (this.#cache.has(compositeId)) {
                return this.#cache.get(compositeId);
            }

            const [userType, userId] = compositeId.split(':');
            if (!userId) throw new ApplicationError('Invalid user ID', 'INVALID_USER_ID', 400);

            let user;

            switch(userType) {
                case 'driver':
                    user = await this.#findWithRetry(() => this.#findDriver(userId), `driver`);
                    break;
                case 'passenger':
                    user = await this.#findWithRetry(() => this.#findPassenger(userId), `passenger`);
                    break;
                case 'admin':
                    user = await this.#findWithRetry(() => this.#findAdmin(userId), `admin`);
                    break;
                default:
                    throw new ApplicationError('Invalid user type', 'INVALID_USER_TYPE', 400);
            }
            return user;
        } catch (error) {
            if (error instanceof ApplicationError) throw error;

            throw new ApplicationError(
                'Failed to fetch user',
                'USER_SERVICE_ERROR',
                503
            );
        }
    }

    async findByCriteria(criteria) {
        try {
            const { userType, ...restCriteria } = criteria;
            let users;

            switch(userType) {
                case 'driver':
                    users = await this.#driverClient.search(restCriteria);
                    break;
                case 'passenger':
                    users = await this.#passengerClient.search(restCriteria);
                    break;
                case 'admin':
                    users = await this.#adminClient.search(restCriteria);
                    break;
                default:
                    throw new ApplicationError('Invalid user type', 'INVALID_USER_TYPE', 400);
            }

            return users.map(UserEntity.createFromServiceDTO);
        } catch (error) {
            throw new ApplicationError(
                'User search failed',
                'USER_SERVICE_ERROR',
                503
            );
        }
    }

    async verifyAccessToken(token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            return this.findById(decoded.compositeId);
        } catch (error) {
            throw new ApplicationError(
                'Invalid access token',
                'INVALID_TOKEN',
                401
            );
        }
    }

    async #findWithRetry(fn, context, retries = 3) {
        for (let i = 0; i < retries; i++) {
            try {
                return await Promise.race([
                    fn(),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Timeout')), this.#timeout))
                ]);
            } catch (error) {
                logger.warn(`Attempt ${i+1} failed for ${context}: ${error.message}`);
                if (i === retries - 1) throw error;
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
            }
        }
    }

    async #findDriver(driverId) {
        const response = await this.#driverClient.get(`/driver/${driverId}`, {
            timeout: this.#timeout
        });
        return this.#processUserResponse(response, 'driver');
    }

    async #findPassenger(passengerId) {
        const response = await this.#passengerClient.post(
            "/passenger/find-by-id",
            { id: passengerId },
            { timeout: this.#timeout }
        );
        return this.#processUserResponse(response, 'passenger');
    }

    async #findAdmin(adminId) {
        const response = await this.#adminClient.get(`/admin/${adminId}`, {
            timeout: this.#timeout
        });
        return this.#processUserResponse(response, 'admin');
    }

    #processUserResponse(response, userType) {
        if (!response?.data?.id) {
            throw new ApplicationError(
                `Invalid ${userType} service response`,
                'SERVICE_ERROR',
                503
            );
        }
        return UserEntity.createFromAuthServiceDTO({
            ...response.data,
            userType
        });
    }

    #handleUserError(error) {
        if (error instanceof ApplicationError) return error;

        return new ApplicationError(
            error.message.includes('Timeout')
                ? 'User service timeout'
                : 'Failed to fetch user',
            'USER_SERVICE_ERROR',
            error.message.includes('Timeout') ? 504 : 503
        );
    }
}