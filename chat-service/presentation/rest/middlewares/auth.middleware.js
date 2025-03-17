import {ApplicationError} from "../../../application/exceptions/application.error.js";
import {AuthService} from '../../../application/services/auth.servcie.js';

const authService = new AuthService()


export const authMiddleware = (roles = []) => {
    return async (req, res, next) => {
        let userType, userId;
        try {
            const token = req.headers.authorization?.split(" ")[1];
            if (!token) throw new Error("Missing token");

            const user = await authService.verifyToken(token);

            if (roles.length && !roles.includes(user.role)) {
                throw new ApplicationError("Forbidden", "FORBIDDEN", 403);
            }

            user.compositeId = `${user.userType}:${user.userId}`;
            req.user = user;
            next();
        } catch (error) {
            console.log('error', error.message);
            res.status(401).json({
                error: {
                    code: "UNAUTHORIZED",
                    message: "Authentication failed"
                }
            });
        }
    };
};