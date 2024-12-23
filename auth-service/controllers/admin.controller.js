import logger from '../utils/logger.js';
import {adminLoginSchema} from "../validators/login.validator.js";
import validateMiddleware from "../middlewares/validate.middleware.js";
import Admin from "../models/admin.model.js";
import {createAdminSchema} from "../validators/admin.validator.js";
import {loginAdminService} from "../services/admin.service.js";

export const loginAdmin = [
    validateMiddleware(adminLoginSchema),
    async (req, res) => {
        logger.info('loginAdmin: Начало обработки запроса');
        try {
            const { username, password } = req.body;

            const result = await loginAdminService({ username, password });
            logger.info('loginAdmin: Вход выполнен успешно');

            res.status(200).json({
                message: 'Успешный вход',
                userId: result.id,
                token: result.token,
                role: result.role,
                city: result.city,
            });
        } catch (error) {
            logger.error('Ошибка при логине администратора', { error: error.message });
            res.status(401).json({ error: error.message });
        }
    }
]

export const createAdmin = [
    validateMiddleware(createAdminSchema),
    async (req, res) => {
        logger.info('createAdminOrModerator: Начало обработки запроса');
        try {
            const { username, password, role: bodyRole, city } = req.body;

            const userRole = req.user.role;
            let role;
            if (userRole === 'superadmin') {
                role = bodyRole;
                if (!['admin', 'moderator'].includes(role)) {
                    logger.warn('createAdminOrModerator: Неверная роль для superadmin', { role });
                    return res.status(400).json({ message: 'Роль должна быть admin или moderator' });
                }
            } else if (userRole === 'admin') {
                role = 'moderator';
            } else {
                logger.warn('createAdminOrModerator: Доступ запрещен', { userRole });
                return res.status(403).json({ message: 'Доступ запрещен' });
            }

            const existingUser = await Admin.findOne({ where: { username } });
            if (existingUser) {
                logger.warn('createAdminOrModerator: Пользователь с таким ником уже существует', { username });
                return res.status(400).json({ message: 'Пользователь с таким ником уже существует' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            const newUser = await Admin.create({
                username,
                password: hashedPassword,
                role,
                city: role === 'moderator' ? city : null,
            });

            logger.info('createAdminOrModerator: Пользователь успешно создан', { username, role });
            res.status(201).json({ message: 'Пользователь успешно создан', user: { username, role, city } });
        } catch (error) {
            logger.error('createAdminOrModerator: Ошибка при создании пользователя', { error: error.message });
            res.status(400).json({ error: error.message });
        }
    },
];