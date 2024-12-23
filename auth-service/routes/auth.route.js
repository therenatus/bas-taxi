    // // routes/auth.js
    // import express from 'express';
    // import multer from 'multer';
    // import {
    //     registerPassenger,
    //     registerDriver,
    //     login,
    //     confirmLogin, loginOrRegister,
    // } from '../controllers/auth.controller.js';
    // import {loginAdminService} from "../services/auth.service.js";
    //
    // const router = express.Router();
    //
    // // Настройка Multer для загрузки файлов
    // const storage = multer.diskStorage({
    //     destination: function (req, file, cb) {
    //         cb(null, 'uploads/'); // Папка для загрузки файлов
    //     },
    //     filename: function (req, file, cb) {
    //         const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    //         cb(null, uniqueSuffix + '-' + file.originalname);
    //     }
    // });
    //
    // const upload = multer({
    //     storage,
    //     fileFilter: (req, file, cb) => {
    //         const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    //         if (allowedTypes.includes(file.mimetype)) {
    //             cb(null, true);
    //         } else {
    //             cb(new Error('Недопустимый тип файла. Разрешены только JPEG и PNG.'), false);
    //         }
    //     },
    //     limits: { fileSize: 5 * 1024 * 1024 }, // Ограничение размера файла до 5 МБ
    // });
    //
    // // /**
    // //  * @swagger
    // //  * tags:
    // //  *   name: Auth
    // //  *   description: Маршруты для аутентификации и регистрации
    // //  */
    // //
    // // /**
    // //  * @swagger
    // //  * /auth/register/passenger:
    // //  *   post:
    // //  *     summary: Регистрация пассажира
    // //  *     tags: [Auth]
    // //  *     requestBody:
    // //  *       required: true
    // //  *       content:
    // //  *         application/json:
    // //  *           schema:
    // //  *             type: object
    // //  *             required:
    // //  *               - phoneNumber
    // //  *               - fullName
    // //  *             properties:
    // //  *               phoneNumber:
    // //  *                 type: string
    // //  *                 description: Номер телефона пассажира в формате +1234567890
    // //  *                 example: "+1234567890"
    // //  *               fullName:
    // //  *                 type: string
    // //  *                 description: Полное имя пассажира
    // //  *                 example: "Иван Иванов"
    // //  *     responses:
    // //  *       201:
    // //  *         description: Пассажир успешно зарегистрирован
    // //  *         content:
    // //  *           application/json:
    // //  *             schema:
    // //  *               type: object
    // //  *               properties:
    // //  *                 message:
    // //  *                   type: string
    // //  *                   example: "Пассажир успешно зарегистрирован. Проверьте SMS для подтверждения номера телефона."
    // //  *       400:
    // //  *         description: Ошибка валидации или другой запрос
    // //  *         content:
    // //  *           application/json:
    // //  *             schema:
    // //  *               $ref: '#/components/schemas/Error'
    // //  */
    // // router.post(
    // //     '/register/passenger',
    // //     upload.none(), // Пассажир не загружает файлы
    // //     registerPassenger
    // // );
    //
    // /**
    //  * @swagger
    //  * /auth/register/driver:
    //  *   post:
    //  *     summary: Регистрация водителя
    //  *     tags: [Auth]
    //  *     requestBody:
    //  *       required: true
    //  *       content:
    //  *         multipart/form-data:
    //  *           schema:
    //  *             type: object
    //  *             required:
    //  *               - phoneNumber
    //  *               - fullName
    //  *               - address
    //  *               - city
    //  *               - carBrand
    //  *               - carModel
    //  *               - licensePlate
    //  *               - manufactureDate
    //  *               - vinCode
    //  *               - driversLicensePhoto
    //  *               - technicalPassportFrontPhoto
    //  *               - technicalPassportBackPhoto
    //  *               - identityDocumentFrontPhoto
    //  *               - identityDocumentWithHandsPhoto
    //  *               - carPhotoFront
    //  *               - carPhotoRight
    //  *               - carPhotoBack
    //  *               - carPhotoLeft
    //  *               - carPhotoFrontPassenger
    //  *               - carPhotoRearSeats
    //  *               - carPhotoOpenTrunk
    //  *             properties:
    //  *               phoneNumber:
    //  *                 type: string
    //  *                 description: Номер телефона водителя в формате +1234567890
    //  *                 example: "+1234567891"
    //  *               fullName:
    //  *                 type: string
    //  *                 description: Полное имя водителя
    //  *                 example: "Пётр Петров"
    //  *               address:
    //  *                 type: string
    //  *                 description: Адрес проживания
    //  *                 example: "ул. Ленина, д.1"
    //  *               city:
    //  *                 type: string
    //  *                 description: Город проживания
    //  *                 example: "Москва"
    //  *               technicalPassport:
    //  *                 type: string
    //  *                 description: Технический паспорт автомобиля
    //  *                 example: "1234567890"
    //  *               carBrand:
    //  *                 type: string
    //  *                 description: Марка автомобиля
    //  *                 example: "Toyota"
    //  *               carModel:
    //  *                 type: string
    //  *                 description: Модель автомобиля
    //  *                 example: "Camry"
    //  *               licensePlate:
    //  *                 type: string
    //  *                 description: Гос. номер автомобиля
    //  *                 example: "AB123CD"
    //  *               manufactureDate:
    //  *                 type: string
    //  *                 format: date
    //  *                 description: Дата выпуска автомобиля
    //  *                 example: "2020-01-01"
    //  *               vinCode:
    //  *                 type: string
    //  *                 description: VIN код автомобиля
    //  *                 example: "1HGCM82633A004352"
    //  *               driversLicensePhoto:
    //  *                 type: string
    //  *                 format: binary
    //  *                 description: Фото водительского удостоверения
    //  *               technicalPassportFrontPhoto:
    //  *                 type: string
    //  *                 format: binary
    //  *                 description: Фото технического паспорта (лицевая сторона)
    //  *               technicalPassportBackPhoto:
    //  *                 type: string
    //  *                 format: binary
    //  *                 description: Фото технического паспорта (тыльная сторона)
    //  *               identityDocumentFrontPhoto:
    //  *                 type: string
    //  *                 format: binary
    //  *                 description: Фото удостоверения личности (лицевая сторона)
    //  *               identityDocumentWithHandsPhoto:
    //  *                 type: string
    //  *                 format: binary
    //  *                 description: Фото удостоверения личности с удостоверением в руках
    //  *               carPhotoFront:
    //  *                 type: string
    //  *                 format: binary
    //  *                 description: Фото автомобиля спереди
    //  *               carPhotoRight:
    //  *                 type: string
    //  *                 format: binary
    //  *                 description: Фото автомобиля справа
    //  *               carPhotoBack:
    //  *                 type: string
    //  *                 format: binary
    //  *                 description: Фото автомобиля сзади
    //  *               carPhotoLeft:
    //  *                 type: string
    //  *                 format: binary
    //  *                 description: Фото автомобиля слева
    //  *               carPhotoFrontPassenger:
    //  *                 type: string
    //  *                 format: binary
    //  *                 description: Фото переднего пассажирского сиденья
    //  *               carPhotoRearSeats:
    //  *                 type: string
    //  *                 format: binary
    //  *                 description: Фото заднего ряда сидений
    //  *               carPhotoOpenTrunk:
    //  *                 type: string
    //  *                 format: binary
    //  *                 description: Фото открытого багажника
    //  *     responses:
    //  *       201:
    //  *         description: Водитель успешно зарегистрирован
    //  *         content:
    //  *           application/json:
    //  *             schema:
    //  *               type: object
    //  *               properties:
    //  *                 message:
    //  *                   type: string
    //  *                   example: "Водитель успешно зарегистрирован. Проверьте SMS для подтверждения номера телефона."
    //  *       400:
    //  *         description: Ошибка валидации или другой запрос
    //  *         content:
    //  *           application/json:
    //  *             schema:
    //  *               $ref: '#/components/schemas/Error'
    //  */
    // router.post(
    //     '/register/driver',
    //     upload.fields([
    //         { name: 'driversLicensePhoto', maxCount: 1 },
    //         { name: 'technicalPassportFrontPhoto', maxCount: 1 },
    //         { name: 'technicalPassportBackPhoto', maxCount: 1 },
    //         { name: 'identityDocumentFrontPhoto', maxCount: 1 },
    //         { name: 'identityDocumentWithHandsPhoto', maxCount: 1 },
    //         { name: 'carPhotoFront', maxCount: 1 },
    //         { name: 'carPhotoRight', maxCount: 1 },
    //         { name: 'carPhotoBack', maxCount: 1 },
    //         { name: 'carPhotoLeft', maxCount: 1 },
    //         { name: 'carPhotoFrontPassenger', maxCount: 1 },
    //         { name: 'carPhotoRearSeats', maxCount: 1 },
    //         { name: 'carPhotoOpenTrunk', maxCount: 1 },
    //     ]),
    //     registerDriver
    // );
    //
    // /**
    //  * @swagger
    //  * /auth/login-driver:
    //  *   post:
    //  *     summary: Логин водителя (отправка кода верификации)
    //  *     tags: [Auth]
    //  *     requestBody:
    //  *       required: true
    //  *       content:
    //  *         application/json:
    //  *           schema:
    //  *             type: object
    //  *             required:
    //  *               - phoneNumber
    //  *             properties:
    //  *               phoneNumber:
    //  *                 type: string
    //  *                 description: Номер телефона пользователя в формате +1234567890
    //  *                 example: "+1234567890"
    //  *     responses:
    //  *       200:
    //  *         description: Код верификации отправлен по SMS
    //  *         content:
    //  *           application/json:
    //  *             schema:
    //  *               type: object
    //  *               properties:
    //  *                 message:
    //  *                   type: string
    //  *                   example: "Код верификации отправлен по SMS."
    //  *       400:
    //  *         description: Ошибка валидации или другой запрос
    //  *         content:
    //  *           application/json:
    //  *             schema:
    //  *               $ref: '#/components/schemas/Error'
    //  */
    // router.post('/login/driver', login);
    //
    // /**
    //  * @swagger
    //  * /auth/login/confirm:
    //  *   post:
    //  *     summary: Подтверждение логина с кодом верификации
    //  *     tags: [Auth]
    //  *     requestBody:
    //  *       required: true
    //  *       content:
    //  *         application/json:
    //  *           schema:
    //  *             type: object
    //  *             required:
    //  *               - phoneNumber
    //  *               - verificationCode
    //  *             properties:
    //  *               phoneNumber:
    //  *                 type: string
    //  *                 description: Номер телефона пользователя в формате +1234567890
    //  *                 example: "+1234567890"
    //  *               verificationCode:
    //  *                 type: string
    //  *                 description: Код верификации из SMS
    //  *                 example: "123456"
    //  *     responses:
    //  *       200:
    //  *         description: Подтверждение логина успешно, возвращается JWT токен
    //  *         content:
    //  *           application/json:
    //  *             schema:
    //  *               type: object
    //  *               properties:
    //  *                 token:
    //  *                   type: string
    //  *                   description: JWT токен
    //  *                   example: "your_jwt_token_here"
    //  *       400:
    //  *         description: Ошибка валидации или другой запрос
    //  *         content:
    //  *           application/json:
    //  *             schema:
    //  *               $ref: '#/components/schemas/Error'
    //  */
    // router.post('/login/confirm', confirmLogin);
    //
    // /**
    //  * @swagger
    //  * /auth/login:
    //  *   post:
    //  *     summary: Логин или регистрация пользователя
    //  *     tags: [Auth]
    //  *     requestBody:
    //  *       required: true
    //  *       content:
    //  *         application/json:
    //  *           schema:
    //  *             type: object
    //  *             required:
    //  *               - phoneNumber
    //  *               - fullName
    //  *             properties:
    //  *               phoneNumber:
    //  *                 type: string
    //  *                 description: Номер телефона пользователя в формате +1234567890
    //  *                 example: "+1234567890"
    //  *               fullName:
    //  *                 type: string
    //  *                 description: Полное имя пользователя (необязательно для регистрации)
    //  *                 example: "Иван Иванов"
    //  *     responses:
    //  *       200:
    //  *         description: Код верификации отправлен по SMS
    //  *         content:
    //  *           application/json:
    //  *             schema:
    //  *               type: object
    //  *               properties:
    //  *                 message:
    //  *                   type: string
    //  *                   example: "Код верификации отправлен по SMS."
    //  *       201:
    //  *         description: Пользователь создан и код верификации отправлен
    //  *         content:
    //  *           application/json:
    //  *             schema:
    //  *               type: object
    //  *               properties:
    //  *                 message:
    //  *                   type: string
    //  *                   example: "Пользователь создан. Код верификации отправлен по SMS."
    //  *       400:
    //  *         description: Ошибка валидации или другой запрос
    //  *         content:
    //  *           application/json:
    //  *             schema:
    //  *               $ref: '#/components/schemas/Error'
    //  */
    // router.post('/login', loginOrRegister);
    //
    //
    // router.post('/login', async (req, res) => {
    //     try {
    //         const { username, password } = req.body;
    //
    //         if (!username || !password) {
    //             return res.status(400).json({ message: 'Ник и пароль обязательны' });
    //         }
    //
    //         const result = await loginAdminService({ username, password });
    //
    //         res.status(200).json({
    //             message: 'Успешный вход',
    //             token: result.token,
    //             role: result.role,
    //             city: result.city,
    //         });
    //     } catch (error) {
    //         res.status(401).json({ message: error.message });
    //     }
    // });
    //
    // // /**
    // //  * @swagger
    // //  * /auth/health:
    // //  *   get:
    // //  *     summary: Проверка состояния сервиса
    // //  *     tags: [Auth]
    // //  *     responses:
    // //  *       200:
    // //  *         description: Сервис работает нормально
    // //  *         content:
    // //  *           application/json:
    // //  *             schema:
    // //  *               type: object
    // //  *               properties:
    // //  *                 status:
    // //  *                   type: string
    // //  *                   example: "OK"
    // //  */
    // // router.get('/health', (req, res) => {
    // //     res.status(200).json({ status: 'OK' });
    // // });
    //
    // export default router;
