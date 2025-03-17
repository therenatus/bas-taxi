import jwt from 'jsonwebtoken';
import { ApplicationError } from '../exceptions/application.error.js';

export class AuthService {
    #secretKey;

    constructor(secretKey) {
        this.#secretKey = process.env.JWT_SECRET;
    }

    async verifyToken(token) {
        try {
            const decoded = jwt.verify(token, this.#secretKey);
            let userType, userId;

            if (decoded.adminId) {
                userType = 'admin';
                userId = decoded.adminId;
            } else if (decoded.driverId) {
                userType = 'driver';
                userId = decoded.driverId;
            } else if (decoded.userId) {
                userType = 'passenger';
                userId = decoded.userId;
            }
            return { userType, userId, role: decoded.role };
        } catch (error) {
            throw new ApplicationError('Недействительный токен', 'INVALID_TOKEN', 401);
        }
    }
}