import express from 'express';
import multer from 'multer';
import {
        registerDriver,
        confirmDriverLogin,
        loginDriver,
        getDriverById,
        getDriverData, verifyTokenController, deleteDriverProfile
} from '../controllers/driver.controller.js';
import path from "path";
import * as fs from "node:fs";
import {fileURLToPath} from "url";
import slugify from "slugify";
import logger from "../utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const storage = multer.diskStorage({
        destination: (req, file, cb) => {
                const uploadDir = path.join(__dirname, '../uploads');
                if (!fs.existsSync(uploadDir)) {
                        fs.mkdirSync(uploadDir, { recursive: true });
                }
                cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
                const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
                let safeFileName = slugify(file.originalname, { lower: true });

                if (safeFileName.length > 100) {
                        safeFileName = safeFileName.substring(0, 100);
                }
                cb(null, `${uniqueSuffix}-${safeFileName}`);
        },
});
const upload = multer({ storage });

/**
 * @swagger
 * tags:
 *   name: Driver
 *   description: Маршруты для водителей
 */

router.get('/:id', getDriverById);
router.get('/data/:id', getDriverData);


/**
 * @swagger
 * /auth/driver/register:
 *   post:
 *     summary: Регистрация водителя
 *     tags: [Driver]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - phoneNumber
 *               - fullName
 *               - address
 *               - city
 *               - carBrand
 *               - carModel
 *               - licensePlate
 *               - manufactureDate
 *               - vinCode
 *               - driversLicensePhoto
 *               - technicalPassportFrontPhoto
 *               - technicalPassportBackPhoto
 *               - identityDocumentFrontPhoto
 *               - identityDocumentWithHandsPhoto
 *               - carPhotoFront
 *               - carPhotoRight
 *               - carPhotoBack
 *               - carPhotoLeft
 *               - carPhotoFrontPassenger
 *               - carPhotoRearSeats
 *               - carPhotoOpenTrunk
 *             properties:
 *               phoneNumber:
 *                 type: string
 *                 description: Номер телефона водителя в формате +1234567890
 *                 example: "+1234567891"
 *               fullName:
 *                 type: string
 *                 description: Полное имя водителя
 *                 example: "Пётр Петров"
 *               address:
 *                 type: string
 *                 description: Адрес проживания
 *                 example: "ул. Ленина, д.1"
 *               city:
 *                 type: string
 *                 description: Город проживания
 *                 example: "Москва"
 *               technicalPassport:
 *                 type: string
 *                 description: Технический паспорт автомобиля
 *                 example: "1234567890"
 *               carBrand:
 *                 type: string
 *                 description: Марка автомобиля
 *                 example: "Toyota"
 *               carModel:
 *                 type: string
 *                 description: Модель автомобиля
 *                 example: "Camry"
 *               licensePlate:
 *                 type: string
 *                 description: Гос. номер автомобиля
 *                 example: "AB123CD"
 *               manufactureDate:
 *                 type: string
 *                 format: date
 *                 description: Дата выпуска автомобиля
 *                 example: "2020-01-01"
 *               vinCode:
 *                 type: string
 *                 description: VIN код автомобиля
 *                 example: "1HGCM82633A004352"
 *               driversLicensePhoto:
 *                 type: string
 *                 format: binary
 *                 description: Фото водительского удостоверения
 *               technicalPassportFrontPhoto:
 *                 type: string
 *                 format: binary
 *                 description: Фото технического паспорта (лицевая сторона)
 *               technicalPassportBackPhoto:
 *                 type: string
 *                 format: binary
 *                 description: Фото технического паспорта (тыльная сторона)
 *               identityDocumentFrontPhoto:
 *                 type: string
 *                 format: binary
 *                 description: Фото удостоверения личности (лицевая сторона)
 *               identityDocumentWithHandsPhoto:
 *                 type: string
 *                 format: binary
 *                 description: Фото удостоверения личности с удостоверением в руках
 *               carPhotoFront:
 *                 type: string
 *                 format: binary
 *                 description: Фото автомобиля спереди
 *               carPhotoRight:
 *                 type: string
 *                 format: binary
 *                 description: Фото автомобиля справа
 *               carPhotoBack:
 *                 type: string
 *                 format: binary
 *                 description: Фото автомобиля сзади
 *               carPhotoLeft:
 *                 type: string
 *                 format: binary
 *                 description: Фото автомобиля слева
 *               carPhotoFrontPassenger:
 *                 type: string
 *                 format: binary
 *                 description: Фото переднего пассажирского сиденья
 *               carPhotoRearSeats:
 *                 type: string
 *                 format: binary
 *                 description: Фото заднего ряда сидений
 *               carPhotoOpenTrunk:
 *                 type: string
 *                 format: binary
 *                 description: Фото открытого багажника
 *     responses:
 *       201:
 *         description: Водитель успешно зарегистрирован
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Водитель успешно зарегистрирован. Проверьте SMS для подтверждения номера телефона."
 *       400:
 *         description: Ошибка валидации или другой запрос
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
    '/register',
    (req, res, next) => {
            upload.fields([
                    { name: 'driversLicensePhoto', maxCount: 1 },
                    { name: 'technicalPassportFrontPhoto', maxCount: 1 },
                    { name: 'technicalPassportBackPhoto', maxCount: 1 },
                    { name: 'identityDocumentFrontPhoto', maxCount: 1 },
                    { name: 'identityDocumentWithHandsPhoto', maxCount: 1 },
                    { name: 'carPhotoFront', maxCount: 1 },
                    { name: 'carPhotoRight', maxCount: 1 },
                    { name: 'carPhotoBack', maxCount: 1 },
                    { name: 'carPhotoLeft', maxCount: 1 },
                    { name: 'carPhotoFrontPassenger', maxCount: 1 },
                    { name: 'carPhotoRearSeats', maxCount: 1 },
                    { name: 'carPhotoOpenTrunk', maxCount: 1 },
            ])(req, res, (err) => {
                    if (err) {
                            if (err instanceof multer.MulterError) {
                                    logger.error('Ошибка загрузки файлов:', { error: err.message });
                                    return res.status(400).json({ error: err.message });
                            } else {
                                    logger.error('Ошибка сервера при загрузке файлов:', { error: err.message });
                                    return res.status(500).json({ error: 'Ошибка сервера' });
                            }
                    }
                    next();
            });
    },
    registerDriver
);


/**
 * @swagger
 * /auth/driver/login:
 *   post:
 *     summary: Логин водителя
 *     tags: [Driver]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phoneNumber
 *             properties:
 *               phoneNumber:
 *                 type: string
 *                 example: "+1234567891"
 *     responses:
 *       200:
 *         description: Код отправлен по SMS
 *       400:
 *         description: Ошибка валидации
 */
router.post('/login', loginDriver);

/**
 * @swagger
 * /auth/driver/confirm:
 *   post:
 *     summary: Подтверждение кода верификации
 *     tags: [Driver]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phoneNumber
 *               - verificationCode
 *             properties:
 *               phoneNumber:
 *                 type: string
 *                 example: "+1234567891"
 *               verificationCode:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Код подтвержден
 *       400:
 *         description: Ошибка валидации
 */
router.post('/confirm', confirmDriverLogin);

/**
 * @swagger
 * /auth/verify-token:
 *   get:
 *     summary: Проверка JWT токена
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Токен валиден, возвращены данные пользователя
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userId:
 *                   type: integer
 *                   example: 1
 *                 phoneNumber:
 *                   type: string
 *                   example: "+1234567890"
 *                 role:
 *                   type: string
 *                   example: "passenger"
 *                 isPhoneVerified:
 *                   type: boolean
 *                   example: true
 *       401:
 *         description: Токен недействителен или отсутствует
 */
router.get('/verify-token', verifyTokenController);

/**
 * @swagger
 * /auth/driver/delete:
 *   delete:
 *     summary: Удаление профиля водителя
 *     tags: [Driver]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Профиль успешно удален
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Профиль успешно удален"
 *       400:
 *         description: Неверный запрос или попытка повторного удаления раньше срока
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Повторная регистрация возможна только через 15 дней"
 *       401:
 *         description: Не авторизован
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Требуется авторизация"
 *       404:
 *         description: Водитель не найден
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Водитель не найден"
 *       500:
 *         description: Внутренняя ошибка сервера
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Ошибка при удалении профиля"
 */
router.delete('/delete', verifyTokenController, deleteDriverProfile);

export default router;
