import logger from '../utils/logger.js';
import User from '../models/user.model.js';
import { generateVerificationCode } from '../utils/generate-code.js';
import { sendVerificationCode } from "../utils/sms.service.js";
import jwt from "jsonwebtoken";
import ChangePhone from "../models/change-phone.model.js";

const SMS_SEND_INTERVAL_MS = 60 * 1000;

export const registerPassengerService = async ({ phoneNumber, fullName, correlationId }) => {
    logger.info('registerPassengerService: Начало регистрации пассажира', { correlationId });

    const existingUser = await User.findOne({ where: { phoneNumber } });
    if (existingUser) {
        logger.warn('registerPassengerService: Пользователь с таким номером телефона уже существует', { phoneNumber, fullName, correlationId });
        throw new Error('Номер телефона уже используется');
    }

    const verificationCode = generateVerificationCode();
    logger.info('registerPassengerService: Сгенерирован код верификации', { verificationCode, correlationId });

    const user = await User.create({
        phoneNumber,
        role: 'passenger',
        fullName: fullName,
        isApproved: true,
        isPhoneVerified: true,
        verificationCode,
        lastSmsSentAt: new Date(),
    });
    logger.info('registerPassengerService: Пользователь создан', { user, correlationId });

    await sendVerificationCode(phoneNumber, verificationCode);
    logger.info('registerPassengerService: Код верификации отправлен', { phoneNumber, verificationCode, correlationId });

    return user;
};

export const loginPassengerService = async ({ phoneNumber, correlationId }) => {
    logger.info('loginOrRegisterPassengerService: Начало обработки логина или регистрации', { phoneNumber, correlationId });

    let user = await User.findOne({ where: { phoneNumber } });
    const now = new Date();
    let created = false;

    if (!user) {
        logger.info('loginOrRegisterPassengerService: Пользователь не найден, создаем нового пассажира', { phoneNumber, correlationId });

        const verificationCode = generateVerificationCode();
        logger.info('loginOrRegisterPassengerService: Сгенерирован код верификации', { verificationCode, correlationId });

        user = await User.create({
            phoneNumber,
            role: 'passenger',
            isApproved: true,
            isPhoneVerified: false,
            verificationCode,
            lastSmsSentAt: now,
        });
        logger.info('loginOrRegisterPassengerService: Пользователь создан', { user, correlationId });

        created = true;

        await sendVerificationCode(phoneNumber, verificationCode);
        logger.info('loginOrRegisterPassengerService: Код верификации отправлен', { phoneNumber, verificationCode, correlationId });
    } else {
        if (user.lastSmsSentAt && now - user.lastSmsSentAt < SMS_SEND_INTERVAL_MS) {
            const remainingTime = Math.ceil((SMS_SEND_INTERVAL_MS - (now - user.lastSmsSentAt)) / 1000);
            logger.warn('loginOrRegisterPassengerService: Слишком частая отправка SMS', { phoneNumber, remainingTime, correlationId });
            throw new Error(`Подождите ${remainingTime} секунд перед повторной отправкой SMS`);
        }

        const verificationCode = generateVerificationCode();
        logger.info('loginOrRegisterPassengerService: Сгенерирован новый код верификации', { verificationCode, correlationId });

        user.verificationCode = verificationCode;
        user.lastSmsSentAt = now;
        await user.save();
        logger.info('loginOrRegisterPassengerService: Обновлён код верификации в базе данных', { phoneNumber, verificationCode, correlationId });

        await sendVerificationCode(phoneNumber, verificationCode);
        logger.info('loginOrRegisterPassengerService: Код верификации отправлен', { phoneNumber, verificationCode, correlationId });
    }

    return { created };
};

export const loginPassengerWebService = async ({ phoneNumber, correlationId }) => {
    logger.info('loginOrRegisterPassengerService: Начало обработки логина или регистрации', { phoneNumber, correlationId });
    let token;
    let user = await User.findOne({ where: { phoneNumber } });
    let created = false;

    if (!user) {
        logger.info('loginOrRegisterPassengerWebService: Пользователь не найден, создаем нового пассажира', { phoneNumber, correlationId });

        user = await User.create({
            phoneNumber,
            role: 'passenger',
            isApproved: true,
            isPhoneVerified: true
        });
        created = true;
        logger.info('loginOrRegisterPassengerWebService: Пользователь создан', { user, correlationId });
    }

    token = jwt.sign(
        { userId: user.id, phoneNumber: user.phoneNumber, role: user.role },
        process.env.JWT_SECRET || 'your_jwt_secret',
        { expiresIn: '20d' }
    );
    logger.info('loginPassengerWebService: JWT-токен сгенерирован', { token, correlationId });

    return { userId: user.id, token, created };
};

export const confirmLoginService = async ({ phoneNumber, verificationCode, correlationId }) => {
    logger.info('confirmLoginService: Начало подтверждения логина', { correlationId });

    let user = await User.findOne({ where: { phoneNumber } });

    if (!user) {
        logger.warn('confirmLoginService: Пользователь с таким номером телефона не найден', { phoneNumber, correlationId });
        throw new Error('Пользователь не найден');
    }

    if (user.verificationCode !== verificationCode) {
        logger.warn('confirmLoginService: Неверный код верификации', { phoneNumber, verificationCode, correlationId });
        throw new Error('Неверный код верификации');
    }

    user.isPhoneVerified = true;
    user.verificationCode = null;
    await user.save();
    logger.info('confirmLoginService: Пользователь подтверждён', { phoneNumber, correlationId });

    const token = jwt.sign(
        { userId: user.id, phoneNumber: user.phoneNumber, role: user.role },
        process.env.JWT_SECRET || 'your_jwt_secret',
        { expiresIn: '20d' }
    );
    logger.info('confirmLoginService: JWT-токен сгенерирован', { token, correlationId });

    return { userId: user.id, token };
};

export const verifyTokenService = async (token, correlationId) => {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');

    logger.info('verifyTokenService: Токен расшифрован', { userId: decoded.userId, correlationId });

    const user = await User.findByPk(decoded.userId);

    if (!user) {
        logger.warn('verifyTokenService: Пользователь не найден', { userId: decoded.userId, correlationId });
        throw new Error('Пользователь не найден');
    }

    return {
        userId: user.id,
        phoneNumber: user.phoneNumber,
        role: 'passenger',
        isPhoneVerified: user.isPhoneVerified,
    };
};

export const changePhoneService = async ({ phoneNumber, userId, correlationId }) => {
    try {
        const user = await User.findByPk(userId);
        if (!user) {
            logger.warn('changePhoneService: Пользователь не найден', { phoneNumber, correlationId });
            throw new Error('Пользователь не найден');
        }

        const verificationCode = generateVerificationCode();
        const lastSmsSentAt = new Date();

        const changeRequest = await ChangePhone.create({
            user_id: userId,
            phoneNumber: phoneNumber,
            verificationCode,
            lastSmsSentAt,
        });

        await sendVerificationCode(phoneNumber, verificationCode);
        logger.info('changePhoneService: Код верификации отправлен для изменения номера', { phoneNumber, verificationCode, correlationId });
        return true;
    } catch (error) {
        logger.error('changePhoneService: Ошибка при изменении номера телефона', { error, correlationId });
        return false;
    }
};

export const confirmPhoneService = async ({ phoneNumber, verificationCode, userId, correlationId }) => {
    logger.info('confirmPhoneService: Начало подтверждения нового номера телефона', { correlationId });
    const changeRequest = await ChangePhone.findOne({
        where: {
            user_id: userId,
            phoneNumber,
            verificationCode
        },
        order: [['createdAt', 'DESC']]
    });

    if (!changeRequest) {
        logger.warn('confirmPhoneService: Запрос на изменение номера не найден или неверный код', { userId, phoneNumber, verificationCode, correlationId });
        throw new Error('Неверный код подтверждения или запрос не найден');
    }

    const user = await User.findByPk(userId);
    if (!user) {
        logger.warn('confirmPhoneService: Пользователь не найден', { userId, correlationId });
        throw new Error('Пользователь не найден');
    }

    user.phoneNumber = changeRequest.phoneNumber;
    await user.save();
    await changeRequest.destroy();
    logger.info('confirmPhoneService: Номер телефона успешно изменен', { userId, phoneNumber, correlationId });
};

export const blockUserService = async ({ id, reason, correlationId }) => {
    try {
        logger.info('blockUserService: Начало блокировки пользователя', { id, reason, correlationId });
        const user = await User.findByPk(id);

        if (!user) {
            logger.warn('blockUserService: Пользователь не найден', { id, correlationId });
            throw new Error('Пользователь не найден');
        }

        user.isBlocked = true;
        user.blockReason = reason;
        await user.save();

        logger.info('blockUserService: Пользователь заблокирован', { id, reason, correlationId });
        return user;
    } catch (error) {
        logger.error('blockUserService: Ошибка при блокировке пользователя', { error, correlationId });
        throw error;
    }
};

export const deleteUserService = async ({ id, reason, correlationId }) => {
    try {
        logger.info('deleteUserService: Начало удалении пользователя', { id, reason, correlationId });
        const user = await User.findByPk(id);

        if (!user) {
            logger.warn('deleteUserService: Пользователь не найден', { id, correlationId });
            throw new Error('Пользователь не найден');
        }

        user.isDeleted = true;
        user.blockReason = reason;
        await user.save();

        logger.info('deleteUserService: Пользователь удален', { id, reason, correlationId });
        return user;
    } catch (error) {
        logger.error('deleteUserService: Ошибка при удалении пользователя', { error, correlationId });
        throw error;
    }
};

export const changeNameService = async ({id, fullName, correlationId }) => {
    try {
        logger.info('changeNameService: Начало изменения имени', { id, fullName, correlationId });
        const user = await User.findByPk(id);

        if (!user) {
            logger.warn('changeNameService: Пользователь не найден', { id, correlationId });
            throw new Error('Пользователь не найден');
        }

        user.fullName = fullName;
        await user.save();

        logger.info('changeNameService: Имя изменено', { id, fullName, correlationId });
        return user;
    } catch (error) {
        logger.error('changeNameService: Ошибка при изменении имени', { error, correlationId });
        throw error;
    }
};

export const findUserByIdService = async ({ id, correlationId }) => {
    try {
        logger.info('findUserByIdService: Поиск пользователя по ID', { id, correlationId });
        const user = await User.findByPk(id);
        return user;
    } catch (error) {
        logger.error('findUserByIdService: Ошибка при поиске пользователя', { error, correlationId });
        throw error;
    }
};

export const findUserByNameService = async ({ fullName, correlationId }) => {
    try {
        logger.info('findUserByNameService: Поиск пользователя по имени', { fullName, correlationId });
        const user = await User.findOne({ where: { fullName } });
        return user;
    } catch (error) {
        logger.error('findUserByNameService: Ошибка при поиске пользователя по имени', { error, correlationId });
        throw error;
    }
};

export const findUserByPhoneService = async ({ phoneNumber, correlationId }) => {
    try {
        logger.info('findUserByPhoneService: Поиск пользователя по номеру телефона', { phoneNumber, correlationId });
        const user = await User.findOne({ where: { phoneNumber } });
        return user;
    } catch (error) {
        logger.error('findUserByPhoneService: Ошибка при поиске пользователя по номеру телефона', { error, correlationId });
        throw error;
    }
};

export const deleteSelfService = async ({ userId, correlationId }) => {
    try {
        logger.info('deleteSelfService: Начало самоудаления пользователя', { userId, correlationId });
        const user = await User.findByPk(userId);

        if (!user) {
            logger.warn('deleteSelfService: Пользователь не найден', { userId, correlationId });
            throw new Error('Пользователь не найден');
        }

        user.isDeleted = true;
        user.deletedAt = new Date();
        user.blockReason = 'Самоудаление аккаунта';
        await user.save();

        logger.info('deleteSelfService: Пользователь удалил свой аккаунт', { userId, correlationId });
        return user;
    } catch (error) {
        logger.error('deleteSelfService: Ошибка при самоудалении пользователя', { error, correlationId });
        throw error;
    }
};