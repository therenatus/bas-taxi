import jwt from 'jsonwebtoken';

const authMiddleware = (roles = []) => {
    return async (req, res, next) => {
        try {
            const token = req.headers.authorization?.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            if (roles.length && !roles.includes(decoded.role)) {
                throw new Error('Forbidden');
            }

            req.user = decoded;
            next();
        } catch (error) {
            res.status(401).json({ error: 'Authentication failed' });
        }
    };
};