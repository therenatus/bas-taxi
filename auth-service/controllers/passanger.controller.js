import logger from '../utils/logger.js';
import validateMiddleware from '../middlewares/validate.middleware.js';
import {passengerRegisterSchema} from "../validators/register-passenger.validator.js";
import {confirmLoginService, loginPassengerService, registerPassengerService} from "../services/passanger.service.js";
import {confirmLoginSchema, loginSchema} from "../validators/login.validator.js";

export const registerPassenger = [
    validateMiddleware(passengerRegisterSchema),
    async (req, res) => {
        logger.info('registerPassenger: Начало обработки запроса');
        try {
            const { phoneNumber } = req.body;
            logger.info('registerPassenger: Получены данные', { phoneNumber });

            await registerPassengerService({ phoneNumber });
            logger.info('registerPassenger: Регистрация пассажира завершена успешно');

            res.status(201).json({ message: 'Пассажир успешно зарегистрирован. Проверьте SMS для подтверждения номера телефона.' });
        } catch (error) {
            logger.error('Ошибка при регистрации пассажира', { error: error.message });
            res.status(400).json({ error: error.message });
        }
    },
];

export const loginOrRegister = [
    validateMiddleware(loginSchema),
    async (req, res) => {
        logger.info('loginOrRegisterPassenger: Начало обработки запроса');
        try {
            const { phoneNumber, fullName } = req.body;
            logger.info('loginOrRegisterPassenger: Получены данные', { phoneNumber, fullName });

            const result = await loginPassengerService({ phoneNumber, fullName });

            if (result.created) {
                logger.info('loginOrRegisterPassenger: Пользователь создан и код отправлен');
                res.status(201).json({ message: 'Пользователь создан. Код верификации отправлен по SMS.' });
            } else {
                logger.info('loginOrRegisterPassenger: Пользователь найден и код отправлен');
                res.status(200).json({ message: 'Код верификации отправлен по SMS.' });
            }
        } catch (error) {
            logger.error('Ошибка при логине или регистрации пассажира', { error: error.message });
            res.status(400).json({ error: error.message });
        }
    },
];

export const confirmLogin = [
    validateMiddleware(confirmLoginSchema),
    async (req, res) => {
        logger.info('confirmPassengerLogin: Начало обработки запроса');
        try {
            const { phoneNumber, verificationCode } = req.body;

            const {userId, token} = await confirmLoginService({ phoneNumber, verificationCode });
            logger.info('confirmPassengerLogin: Логин подтвержден успешно');

            res.status(200).json({ userId, token });
        } catch (error) {
            logger.error('Ошибка при подтверждении логина пассажира', { error: error.message });
            res.status(400).json({ error: error.message });
        }
    },
];
