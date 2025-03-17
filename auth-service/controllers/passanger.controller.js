import logger from '../utils/logger.js';
import validateMiddleware from '../middlewares/validate.middleware.js';
import {passengerRegisterSchema} from "../validators/register-passenger.validator.js";
import {
    blockUserService, changeNameService,
    changePhoneService,
    confirmLoginService,
    confirmPhoneService,
    deleteUserService,
    findUserByIdService,
    findUserByNameService,
    findUserByPhoneService,
    loginPassengerService,
    loginPassengerWebService,
    registerPassengerService, verifyTokenService
} from "../services/passanger.service.js";
import {confirmLoginSchema, loginSchema} from "../validators/login.validator.js";

export const registerPassenger = async (req, res) => {
    const correlationId = req.headers['x-correlation-id'] || req.headers['correlationid'];
    logger.info('registerPassenger: Начало обработки запроса', { correlationId });
    try {
        const { phoneNumber } = req.body;
        logger.info('registerPassenger: Получены данные', { phoneNumber, correlationId });

        await registerPassengerService({ phoneNumber, correlationId });
        logger.info('registerPassenger: Регистрация пассажира завершена успешно', { correlationId });

        res.status(201).json({
            message: 'Пассажир успешно зарегистрирован. Проверьте SMS для подтверждения номера телефона.'
        });
    } catch (error) {
        logger.error('Ошибка при регистрации пассажира', { error: error.message, correlationId });
        res.status(400).json({ error: error.message });
    }
};

export const loginOrRegister = async (req, res) => {
    const correlationId = req.headers['x-correlation-id'] || req.headers['correlationid'];
    logger.info('loginOrRegisterPassenger: Начало обработки запроса', { correlationId });
    try {
        const { phoneNumber, fullName } = req.body;
        logger.info('loginOrRegisterPassenger: Получены данные', { phoneNumber, fullName, correlationId });

        const result = await loginPassengerService({ phoneNumber, correlationId });

        if (result.created) {
            logger.info('loginOrRegisterPassenger: Пользователь создан и код отправлен', { correlationId });
            res.status(201).json({ message: 'Пользователь создан. Код верификации отправлен по SMS.' });
        } else {
            logger.info('loginOrRegisterPassenger: Пользователь найден и код отправлен', { correlationId });
            res.status(200).json({ message: 'Код верификации отправлен по SMS.' });
        }
    } catch (error) {
        logger.error('Ошибка при логине или регистрации пассажира', { error: error.message, correlationId });
        res.status(400).json({ error: error.message });
    }
};

export const loginOrRegisterWeb = async (req, res) => {
    const correlationId = req.headers['x-correlation-id'] || req.headers['correlationid'];
    logger.info('loginOrRegisterPassengerWeb: Начало обработки запроса', { correlationId });
    try {
        const { phoneNumber, fullName } = req.body;
        logger.info('loginOrRegisterPassengerWeb: Получены данные', { phoneNumber, fullName, correlationId });

        const result = await loginPassengerWebService({ phoneNumber, correlationId });
        const { created, ...data } = result;

        if (created) {
            logger.info('loginOrRegisterPassengerWeb: Пользователь создан', { correlationId });
            res.status(201).json({ message: 'Пользователь создан', ...data });
        } else {
            logger.info('loginOrRegisterPassengerWeb: Успешный вход', { correlationId });
            res.status(201).json({ message: 'Вы успешно вошли', ...data });
        }
    } catch (error) {
        logger.error('Ошибка при логине или регистрации пассажира', { error: error.message, correlationId });
        res.status(400).json({ error: error.message });
    }
};

export const confirmLogin = async (req, res) => {
    const correlationId = req.headers['x-correlation-id'] || req.headers['correlationid'];
    logger.info('confirmPassengerLogin: Начало обработки запроса', { correlationId });
    try {
        const { phoneNumber, verificationCode } = req.body;

        const { userId, token } = await confirmLoginService({ phoneNumber, verificationCode, correlationId });
        logger.info('confirmPassengerLogin: Логин подтвержден успешно', { correlationId });

        res.status(200).json({ userId, token });
    } catch (error) {
        logger.error('Ошибка при подтверждении логина пассажира', { error: error.message, correlationId });
        res.status(400).json({ error: error.message });
    }
};

export const verifyTokenController = async (req, res) => {
    const correlationId = req.headers['x-correlation-id'] || req.headers['correlationid'];
    logger.info('verifyToken: Начало проверки токена', { correlationId });

    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        logger.warn('verifyToken: Токен отсутствует или формат неверный', { correlationId });
        return res.status(401).json({ error: 'Требуется токен авторизации' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const userData = await verifyTokenService(token, correlationId);
        res.status(200).json(userData);
    } catch (error) {
        logger.error('verifyToken: Невалидный токен', { error: error.message, correlationId });
        res.status(401).json({ error: error.message });
    }
};

export const changePhone = async (req, res) => {
    const correlationId = req.headers['x-correlation-id'] || req.headers['correlationid'];
    logger.info('changePhone: Начало обработки запроса', { correlationId });
    try {
        const { phoneNumber } = req.body;
        const userId = req.user.userId;

        const send = await changePhoneService({ phoneNumber, userId, correlationId });
        logger.info('changePhone: Код отправлен для подтверждения нового номера', { correlationId });
        if (send) {
            return res.status(200).json({ message: 'Код верификации отправлен по SMS.' });
        }
        return res.status(429).json({ message: 'Что-то пошло не так. Попробуйте позже' });
    } catch (error) {
        logger.error('Ошибка при подтверждении логина пассажира', { error: error.message, correlationId });
        res.status(400).json({ error: error.message });
    }
};

export const confirmPhone = async (req, res) => {
    const correlationId = req.headers['x-correlation-id'] || req.headers['correlationid'];
    logger.info('confirmPhone: Начало обработки запроса', { correlationId });
    try {
        const { phoneNumber, verificationCode } = req.body;
        const userId = req.user.userId;
        await confirmPhoneService({ phoneNumber, verificationCode, userId, correlationId });
        logger.info('confirmPhone: Номер телефона успешно обновлен', { correlationId });
        return res.status(200).json({ message: 'Номер телефона успешно обновлен' });
    } catch (error) {
        logger.error('Ошибка при подтверждении номера телефона', { error: error.message, correlationId });
        return res.status(400).json({ error: error.message });
    }
};

export const blockUser = async (req, res) => {
    const correlationId = req.headers['x-correlation-id'] || req.headers['correlationid'];
    logger.info('blockUser: Начало обработки запроса', { correlationId });
    try {
        const { id, reason } = req.body;
        const user = await blockUserService({ id, reason, correlationId });
        logger.info('blockUser: Пользователь заблокирован', { correlationId, id, reason });
        res.status(200).json(user);
    } catch (error) {
        logger.error('blockUser: Ошибка блокировки пользователя', { error: error.message, correlationId });
        res.status(400).json({ error: error.message });
    }
};

export const deleteUser = async (req, res) => {
    const correlationId = req.headers['x-correlation-id'] || req.headers['correlationid'];
    logger.info('deleteUser: Начало обработки запроса', { correlationId });
    try {
        const { id, reason } = req.body;
        const user = await deleteUserService({ id, reason, correlationId });
        logger.info('deleteUser: Пользователь удалён', { correlationId, id, reason });
        res.status(200).json(user);
    } catch (error) {
        logger.error('deleteUser: Ошибка удаления пользователя', { error: error.message, correlationId });
        res.status(400).json({ error: error.message });
    }
};

export const changeUserName = async (req, res) => {
    const correlationId = req.headers['x-correlation-id'] || req.headers['correlationid'];
    logger.info('changeUserName: Начало обработки запроса', { correlationId });
    try {
        const { id, reason } = req.body;
        const user = await changeNameService({ id, reason, correlationId });
        logger.info('changeUserName: Имя пользователя изменено', { correlationId, id, reason });
        res.status(200).json(user);
    } catch (error) {
        logger.error('changeUserName: Ошибка при изменении имени пользователя', { error: error.message, correlationId });
        res.status(400).json({ error: error.message });
    }
};

export const findUserById = async (req, res) => {
    const correlationId = req.headers['x-correlation-id'] || req.headers['correlationid'];
    logger.info('findUserById: Начало обработки запроса', { correlationId });
    try {
        const { id } = req.body;
        const user = await findUserByIdService({ id, correlationId });
        if (!user) {
            logger.info('findUserById: Пользователь не найден', { correlationId, id });
            return res.status(404).json({ message: 'Пользователь не найден' });
        }
        logger.info('findUserById: Пользователь найден', { correlationId, id });
        res.status(200).json(user);
    } catch (error) {
        logger.error('findUserById: Ошибка при поиске пользователя', { error: error.message, correlationId });
        res.status(400).json({ error: error.message });
    }
};

export const findUserByName = async (req, res) => {
    const correlationId = req.headers['x-correlation-id'] || req.headers['correlationid'];
    logger.info('findUserByName: Начало обработки запроса', { correlationId });
    try {
        const { fullName } = req.body;
        const user = await findUserByNameService({ fullName, correlationId  });
        if (!user) {
            logger.info('findUserByName: Пользователь не найден', { correlationId, fullName });
            return res.status(404).json({ message: 'Пользователь не найден' });
        }
        logger.info('findUserByName: Пользователь найден', { correlationId, fullName });
        res.status(200).json(user);
    } catch (error) {
        logger.error('findUserByName: Ошибка при поиске пользователя', { error: error.message, correlationId });
        res.status(400).json({ error: error.message });
    }
};

export const findUserByPhone = async (req, res) => {
    const correlationId = req.headers['x-correlation-id'] || req.headers['correlationid'];
    logger.info('findUserByPhone: Начало обработки запроса', { correlationId });
    try {
        const { phoneNumber } = req.body;
        const user = await findUserByPhoneService({ phoneNumber, correlationId });
        if (!user) {
            logger.info('findUserByPhone: Пользователь не найден', { correlationId, phoneNumber });
            return res.status(404).json({ message: 'Пользователь не найден' });
        }
        logger.info('findUserByPhone: Пользователь найден', { correlationId, phoneNumber });
        res.status(200).json(user);
    } catch (error) {
        logger.error('findUserByPhone: Ошибка при поиске пользователя', { error: error.message, correlationId });
        res.status(400).json({ error: error.message });
    }
};