import logger from '../utils/logger.js';
import validateMiddleware from '../middlewares/validate.middleware.js';
import {driverRegisterSchema} from "../validators/register-driver.validator.js";
import {confirmLoginSchema, loginSchema} from "../validators/login.validator.js";
import {
    confirmLoginService,
    loginDriverService,
    registerDriverService,
    deleteDriverProfileService,
    blockDriverService,
    unblockDriverService
} from "../services/driver.service.js";
import {sendDriverToExchange} from "../utils/rabbitmq.js";
import Driver from "../models/driver.model.js";
import {verifyTokenService} from "../services/driver.service.js";
import {v4 as uuidv4} from 'uuid';
import {publishEvent} from "../utils/rabbitmq.js";

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
        const driverData = await verifyTokenService(token, correlationId);
        res.status(200).json(driverData);
    } catch (error) {
        logger.error('verifyToken: Невалидный токен', { error: error.message, correlationId });
        res.status(401).json({ error: error.message });
    }
};


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

export const deleteDriverProfile = async (req, res) => {
    // Получаем ID водителя из запроса или из токена
    const driverId = req.user.driverId || req.user.userId;
    logger.info('deleteDriverProfile: Начало обработки запроса на удаление профиля', { driverId });

    if (!driverId) {
        logger.error('deleteDriverProfile: ID водителя не найден', { user: req.user });
        return res.status(400).json({ error: 'ID водителя не найден' });
    }

    try {
        const result = await deleteDriverProfileService(driverId);
        res.status(200).json(result);
    } catch (error) {
        logger.error('deleteDriverProfile: Ошибка при удалении профиля', { 
            error: error.message,
            driverId 
        });
        
        if (error.message.includes('не найден')) {
            return res.status(404).json({ error: error.message });
        }
        
        if (error.message.includes('Повторная регистрация')) {
            return res.status(400).json({ error: error.message });
        }
        
        res.status(500).json({ error: 'Ошибка при удалении профиля' });
    }
};

export const blockDriver = async (req, res) => {
    const { driverId } = req.params;
    const { reason } = req.body;
    const adminId = req.user.adminId;
    const correlationId = req.headers['x-correlation-id'] || req.headers['correlationid'];
    
    logger.info('blockDriver: Начало обработки запроса на блокировку водителя', { 
        driverId, 
        adminId, 
        correlationId 
    });
    
    if (!reason) {
        return res.status(400).json({ 
            error: 'Необходимо указать причину блокировки',
            correlationId 
        });
    }
    
    try {
        const blockedDriver = await blockDriverService(driverId, reason, adminId, correlationId);
        
        // Отправка события в RabbitMQ о блокировке водителя для других сервисов
        try {
            await sendDriverToExchange({ 
                event: 'driver_blocked', 
                driverId, 
                reason, 
                adminId, 
                timestamp: new Date().toISOString() 
            });
            logger.info('blockDriver: Событие о блокировке отправлено в RabbitMQ', { 
                driverId, 
                correlationId 
            });
        } catch (mqError) {
            logger.error('blockDriver: Ошибка при отправке события в RabbitMQ', { 
                error: mqError.message, 
                driverId, 
                correlationId 
            });
            // Продолжаем выполнение даже при ошибке отправки в RabbitMQ
        }
        
        res.status(200).json({ 
            message: 'Водитель успешно заблокирован',
            driverInfo: blockedDriver
        });
    } catch (error) {
        logger.error('blockDriver: Ошибка при блокировке водителя', { 
            error: error.message,
            driverId,
            correlationId
        });
        
        if (error.message.includes('не найден')) {
            return res.status(404).json({ error: error.message });
        }
        
        if (error.message.includes('уже заблокирован')) {
            return res.status(400).json({ error: error.message });
        }
        
        res.status(500).json({ error: 'Ошибка при блокировке водителя', details: error.message });
    }
};

export const unblockDriver = async (req, res) => {
    const correlationId = req.headers['x-correlation-id'] || uuidv4();
    const { driverId } = req.params;
    const adminId = req.user.adminId;

    try {
        logger.info('unblockDriver controller: Запрос на разблокировку водителя', { driverId, adminId, correlationId });
        
        const driverData = await unblockDriverService(driverId, adminId, correlationId);
        
        // Публикуем событие о разблокировке водителя
        const routingKey = 'driver.unblocked';
        const eventData = {
            driverId: driverData.id,
            adminId,
            timestamp: new Date().toISOString()
        };
        
        await publishEvent(routingKey, eventData, correlationId);
        logger.info('unblockDriver controller: Событие о разблокировке водителя опубликовано', { correlationId });
        
        return res.status(200).json({
            success: true,
            message: 'Водитель успешно разблокирован',
            data: driverData
        });
    } catch (error) {
        logger.error('unblockDriver controller: Ошибка при разблокировке водителя', { 
            driverId, 
            error: error.message, 
            correlationId 
        });
        
        return res.status(400).json({
            success: false,
            message: error.message || 'Ошибка при разблокировке водителя'
        });
    }
};
