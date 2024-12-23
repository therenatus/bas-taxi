import logger from '../utils/logger.js';
import Driver from '../models/driver.model.js';
import { generateVerificationCode } from '../utils/generate-code.js';
import { sendVerificationCode } from "../utils/sms.service.js";
import jwt from "jsonwebtoken";

const SMS_SEND_INTERVAL_MS = 60 * 1000; // 1 минута

export const registerDriverService = async (driverData) => {
    logger.info('registerDriverService: Начало регистрации водителя');
    logger.info('driverData:', driverData);
    const { phoneNumber, licensePlate, vinCode } = driverData;

    const existingDriverByPhone = await Driver.findOne({ where: { phoneNumber } });
    logger.info('existingDriverByPhone:', existingDriverByPhone);
    if (existingDriverByPhone) {
        logger.warn('registerDriverService: Водитель с таким номером телефона уже существует', { phoneNumber });
        throw new Error('Номер телефона уже используется');
    }

    const existingLicensePlate = await Driver.findOne({ where: { licensePlate } });
    if (existingLicensePlate) {
        logger.warn('registerDriverService: Госномер уже используется', { licensePlate });
        throw new Error('Госномер уже используется');
    }

    const existingVinCode = await Driver.findOne({ where: { vinCode } });
    if (existingVinCode) {
        logger.warn('registerDriverService: VIN код уже используется', { vinCode });
        throw new Error('VIN код уже используется');
    }

    const verificationCode = generateVerificationCode();
    logger.info('registerDriverService: Сгенерирован код верификации', { verificationCode });

    const driver = await Driver.create({ ...driverData, verificationCode });
    logger.info('registerDriverService: Водитель создан', { driver });

    // await sendVerificationCode(phoneNumber, verificationCode);
    // logger.info('registerDriverService: Код верификации отправлен', { phoneNumber, verificationCode });

    return driver;
};

export const loginDriverService = async ({ phoneNumber }) => {
    logger.info('loginDriverService: Начало логина водителя');

    const driver = await Driver.findOne({ where: { phoneNumber } });
    logger.info('driver',driver);

    if (!driver) {
        logger.warn('loginDriverService: Водитель с таким номером телефона не найден', { phoneNumber });
        throw new Error('Водитель не найден');
    }

    if (!driver.isApproved) {
        logger.warn('loginDriverService: Водитель ещё не подтверждён', { phoneNumber });
        throw new Error('Водитель ещё не подтверждён');
    }

    const now = new Date();
    if (driver.lastSmsSentAt && now - driver.lastSmsSentAt < SMS_SEND_INTERVAL_MS) {
        const remainingTime = Math.ceil((SMS_SEND_INTERVAL_MS - (now - driver.lastSmsSentAt)) / 1000);
        logger.warn('loginDriverService: Слишком частая отправка SMS', { phoneNumber, remainingTime });
        throw new Error(`Подождите ${remainingTime} секунд перед повторной отправкой SMS`);
    }

    const verificationCode = generateVerificationCode();
    logger.info('loginDriverService: Сгенерирован новый код верификации', { verificationCode });

    driver.verificationCode = verificationCode;
    driver.lastSmsSentAt = now;
    await driver.save();
    logger.info('loginDriverService: Обновлён код верификации в базе данных', { phoneNumber, verificationCode });

    await sendVerificationCode(phoneNumber, verificationCode);
    logger.info('loginDriverService: Код верификации отправлен', { phoneNumber, verificationCode });
};


export const confirmLoginService = async ({ phoneNumber, verificationCode }) => {
    logger.info('confirmLoginService: Начало подтверждения логина');

    let driver = await Driver.findOne({ where: { phoneNumber } });

    if (!driver) {
        logger.warn('confirmLoginService: Пользователь с таким номером телефона не найден', { phoneNumber });
        throw new Error('Пользователь не найден');
    }

    if (driver.verificationCode !== verificationCode) {
        logger.warn('confirmLoginService: Неверный код верификации', { phoneNumber, verificationCode });
        throw new Error('Неверный код верификации');
    }

    driver.isPhoneVerified = true;
    driver.verificationCode = null;
    await driver.save();
    logger.info('confirmLoginService: Пользователь подтверждён', { phoneNumber });

    const token = jwt.sign(
        { driverId: driver.id, phoneNumber: driver.phoneNumber, role: 'driver' },
        process.env.JWT_SECRET || 'your_jwt_secret',
        { expiresIn: '20d' }
    );

    logger.info('confirmLoginService: JWT-токен сгенерирован', { token });

    return { driverId: driver.id, token};
};