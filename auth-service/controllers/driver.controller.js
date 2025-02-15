import logger from '../utils/logger.js';
import validateMiddleware from '../middlewares/validate.middleware.js';
import {driverRegisterSchema} from "../validators/register-driver.validator.js";
import {confirmLoginSchema, loginSchema} from "../validators/login.validator.js";
import {confirmLoginService, loginDriverService, registerDriverService} from "../services/driver.service.js";
import {sendDriverToExchange} from "../utils/rabbitmq.js";
import Driver from "../models/driver.model.js";

// export const registerDriver = [
//     validateMiddleware(driverRegisterSchema),
export const registerDriver = async (req, res) => {
        logger.info('registerDriver: Начало обработки запроса');
        try {
            const {
                phoneNumber,
                fullName,
                address,
                city,
                technicalPassport,
                carBrand,
                carModel,
                licensePlate,
                manufactureDate,
                vinCode,
            } = req.body;

            if (!req.files || Object.keys(req.files).length === 0) {
                throw new Error('Все необходимые фотографии должны быть загружены');
            }

            const {
                driversLicensePhoto,
                technicalPassportFrontPhoto,
                technicalPassportBackPhoto,
                identityDocumentFrontPhoto,
                identityDocumentWithHandsPhoto,
                carPhotoFront,
                carPhotoRight,
                carPhotoBack,
                carPhotoLeft,
                carPhotoFrontPassenger,
                carPhotoRearSeats,
                carPhotoOpenTrunk,
            } = req.files;

            const driver = await registerDriverService({
                phoneNumber,
                fullName,
                address,
                city,
                technicalPassport,
                carBrand,
                carModel,
                licensePlate,
                manufactureDate,
                vinCode,
                driversLicensePhoto: driversLicensePhoto[0].filename,
                technicalPassportFrontPhoto: technicalPassportFrontPhoto[0].filename,
                technicalPassportBackPhoto: technicalPassportBackPhoto[0].filename,
                identityDocumentFrontPhoto: identityDocumentFrontPhoto[0].filename,
                identityDocumentWithHandsPhoto: identityDocumentWithHandsPhoto[0].filename,
                carPhotoFront: carPhotoFront[0].filename,
                carPhotoRight: carPhotoRight[0].filename,
                carPhotoBack: carPhotoBack[0].filename,
                carPhotoLeft: carPhotoLeft[0].filename,
                carPhotoFrontPassenger: carPhotoFrontPassenger[0].filename,
                carPhotoRearSeats: carPhotoRearSeats[0].filename,
                carPhotoOpenTrunk: carPhotoOpenTrunk[0].filename,
            });

            logger.info('registerDriver: Регистрация водителя завершена успешно');

            await sendDriverToExchange({ driverId: driver.id, phoneNumber, city })

            res.status(201).json({ message: 'Водитель успешно зарегистрирован' });
        } catch (error) {
            logger.error('Ошибка при регистрации водителя', { error: error.message });
            res.status(400).json({ error: error.message });
        }
    }
//];

export const loginDriver = [
    validateMiddleware(loginSchema),
    async (req, res) => {
        logger.info('loginDriver: Начало обработки запроса');
        try {
            const { phoneNumber } = req.body;

            await loginDriverService({ phoneNumber });
            logger.info('loginDriver: Код отправлен');

            res.status(200).json({ message: 'Код верификации отправлен по SMS.' });
        } catch (error) {
            logger.error('Ошибка при логине водителя', { error: error.message });
            res.status(400).json({ error: error.message });
        }
    },
];

export const confirmDriverLogin = [
    validateMiddleware(confirmLoginSchema),
    async (req, res) => {
        logger.info('confirmDriverLogin: Начало обработки запроса');
        try {
            const { phoneNumber, verificationCode } = req.body;

            const { driverId, token } = await confirmLoginService({ phoneNumber, verificationCode });
            logger.info('confirmDriverLogin: Логин подтвержден успешно');

            res.status(200).json({ driverId, token });
        } catch (error) {
            logger.error('Ошибка при подтверждении логина водителя', { error: error.message });
            res.status(400).json({ error: error.message });
        }
    },
];


export const getDriverById = async (req, res) => {
    const { id } = req.params;
    logger.info('DRIVER ID:', id)
    try {
        const driver = await Driver.findByPk(id);
        logger.info('DRIVER:', driver)
        if (!driver) {
            return res.status(404).json({ error: 'Водитель не найден' });
        }

        res.status(200).json(driver);
    } catch (error) {
        res.status(500).json({ error: 'Ошибка при получении данных водителя' });
    }
};

export const getDriverData = async (req, res) => {
    const { id } = req.params;
    logger.info('DRIVER ID:', id)
    try {
        const driver = await Driver.findByPk(id, {
            attributes: ['id', 'fullName', 'carBrand', 'carModel', 'licensePlate'],
        });
        logger.info('DRIVER:', driver)
        if (!driver) {
            return res.status(404).json({ error: 'Водитель не найден' });
        }

        res.status(200).json(driver);
    } catch (error) {
        res.status(500).json({ error: 'Ошибка при получении данных водителя' });
    }
};
