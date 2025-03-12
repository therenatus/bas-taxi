import {ApplicationError} from "../../../application/exceptions/application.error.js";


export const authMiddleware = (roles = []) => {
    return async (req, res, next) => {
        try {
            const token = req.headers.authorization?.split(" ")[1];
            if (!token) throw new Error("Missing token");

            const user = await req.authService.verifyToken(token);

            if (roles.length && !roles.includes(user.role)) {
                throw new ApplicationError("Forbidden", "FORBIDDEN", 403);
            }

            req.user = user;
            next();
        } catch (error) {
            res.status(401).json({
                error: {
                    code: "UNAUTHORIZED",
                    message: "Authentication failed"
                }
            });
        }
    };
};