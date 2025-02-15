import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

export const roleMiddleware = (roles = []) => {
    return (req, res, next) => {
        const authHeader = req?.headers?.authorization;
        if (!authHeader) {
            return res.status(401).json({ message: 'Token is missing' });
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Token is missing' });
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;

            if (roles.length && !roles.includes(req.user.role)) {
                return res.status(403).json({ message: 'Access denied' });
            }

            next();
        } catch (error) {
            res.status(401).json({ message: 'Invalid token' });
        }
    };
};
