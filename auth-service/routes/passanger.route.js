import express from 'express';
import {
    loginOrRegister,
    confirmLogin,
    loginOrRegisterWeb,
    confirmPhone,
    changePhone,
    findUserByPhone,
    findUserByName,
    findUserById,
    changeUserName,
    deleteUser,
    blockUser,
    verifyTokenController,
    deleteSelf,
    unblockUser
} from '../controllers/passanger.controller.js';
import {roleMiddleware} from "../middlewares/role.middleware.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Passenger
 *   description: Маршруты для пассажиров
 */

/**
 * @swagger
 * /auth/passenger/login:
 *   post:
 *     summary: Логин или регистрация пассажира
 *     tags: [Passenger]
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
 *                 example: "+1234567890"
 *     responses:
 *       200:
 *         description: Успешный вход или регистрация
 *       400:
 *         description: Ошибка валидации
 */
router.post('/login', loginOrRegister);

/**
 * @swagger
 * /auth/passenger/web-login:
 *   post:
 *     summary: Логин или регистрация пассажира web-версия
 *     tags: [Passenger]
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
 *                 example: "+1234567890"
 *     responses:
 *       200:
 *         description: Успешный вход или регистрация
 *       400:
 *         description: Ошибка валидации
 */
router.post('/web-login', loginOrRegisterWeb);

/**
 * @swagger
 * /auth/passenger/confirm:
 *   post:
 *     summary: Подтверждение кода верификации
 *     tags: [Passenger]
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
 *                 example: "+1234567890"
 *               verificationCode:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Код успешно подтвержден
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userId:
 *                   type: integer
 *                   example: 1
 *                 token:
 *                   type: string
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       400:
 *         description: Ошибка валидации или неверный код
 */
router.post('/confirm', confirmLogin);

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
 * /auth/passenger/change-phone:
 *   post:
 *     summary: Запрос на изменение номера телефона
 *     tags: [Passenger]
 *     description: Отправляет код верификации на новый номер телефона
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
 *                 example: "+1234567890"
 *     responses:
 *       200:
 *         description: Код верификации отправлен на новый номер
 *       400:
 *         description: Ошибка валидации или изменения номера
 */
router.post('/change-phone', roleMiddleware(['passenger']), changePhone);

/**
 * @swagger
 * /auth/passenger/confirm-phone:
 *   post:
 *     summary: Подтверждение изменения номера телефона
 *     tags: [Passenger]
 *     description: Подтверждает код верификации для смены номера телефона и обновляет данные пользователя
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
 *                 example: "+1234567890"
 *               verificationCode:
 *                 type: string
 *                 example: "1234"
 *     responses:
 *       200:
 *         description: Номер телефона успешно обновлен
 *       400:
 *         description: Ошибка валидации или подтверждения номера
 */
router.post('/confirm-phone', roleMiddleware(['passenger']), confirmPhone);

/**
 * @swagger
 * /auth/passenger/{userId}/block:
 *   post:
 *     summary: Блокировка пассажира
 *     tags: [Passenger]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Идентификатор пассажира
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Причина блокировки
 *                 example: Нарушение правил использования приложения
 *     responses:
 *       200:
 *         description: Пассажир успешно заблокирован
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Пассажир успешно заблокирован
 *                 userInfo:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     phoneNumber:
 *                       type: string
 *                     isBlocked:
 *                       type: boolean
 *                     blockReason:
 *                       type: string
 *       400:
 *         description: Ошибка входных данных
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Доступ запрещен
 *       404:
 *         description: Пассажир не найден
 *       500:
 *         description: Ошибка сервера
 */
router.post('/:userId/block', roleMiddleware(['admin', 'superadmin']), blockUser);

/**
 * @swagger
 * /auth/passenger/{userId}/unblock:
 *   post:
 *     summary: Разблокировка пассажира
 *     tags: [Passenger]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Идентификатор пассажира
 *     responses:
 *       200:
 *         description: Пассажир успешно разблокирован
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Пассажир успешно разблокирован
 *                 userInfo:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     phoneNumber:
 *                       type: string
 *                     isBlocked:
 *                       type: boolean
 *       400:
 *         description: Ошибка входных данных
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Доступ запрещен
 *       404:
 *         description: Пассажир не найден
 *       500:
 *         description: Ошибка сервера
 */
router.post('/:userId/unblock', roleMiddleware(['admin', 'superadmin']), unblockUser);

router.post('/delete', deleteUser);

/**
 * @swagger
 * /auth/passenger/change-name:
 *   post:
 *     summary: Изменение имени пассажира
 *     tags: [Passenger]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *             properties:
 *               fullName:
 *                 type: string
 *                 description: Новое полное имя пассажира
 *                 example: "Иван Петров"
 *     responses:
 *       200:
 *         description: Имя успешно изменено
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Имя успешно изменено"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     fullName:
 *                       type: string
 *                       example: "Иван Петров"
 *       400:
 *         description: Неверный запрос
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Имя не может быть пустым"
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
 *         description: Пассажир не найден
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Пассажир не найден"
 *       500:
 *         description: Внутренняя ошибка сервера
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Ошибка при изменении имени"
 */
router.post('/change-name',roleMiddleware(['passenger']), changeUserName);

router.post('/find-by-id', findUserById);
router.post('/find-by-name', findUserByName);
router.post('/find-by-phone', findUserByPhone);

/**
 * @swagger
 * /auth/passenger/delete:
 *   delete:
 *     summary: Удалить свой аккаунт
 *     tags: [Passenger]
 *     description: Позволяет пассажиру удалить свой собственный аккаунт
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Аккаунт успешно удален
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Аккаунт успешно удален"
 *       400:
 *         description: Ошибка при удалении аккаунта
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       401:
 *         description: Не авторизован
 */
router.delete('/delete', roleMiddleware(['passenger']), deleteSelf);

// router.get('/:id', getDriverById);
// router.get('/data/:id', getDriverData);
//
// router.post('/block', blockUser);
// router.post('/delete', deleteUser);
// router.post('/change-name', changeUserName);
// router.post('/find-by-id', findUserById);
// router.post('/find-by-name', findUserByName);
// router.post('/find-by-phone', findUserByPhone);


export default router;