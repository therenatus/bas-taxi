import express from 'express';
import {
    loginOrRegister,
    confirmLogin,
    loginOrRegisterWeb,
    confirmPhone,
    changePhone, findUserByPhone, findUserByName, findUserById, changeUserName, deleteUser, blockUser
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
 *       400:
 *         description: Ошибка валидации
 */
router.post('/confirm', confirmLogin);

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

router.post('/block', blockUser);
router.post('/delete', deleteUser);
router.post('/change-name', changeUserName);
router.post('/find-by-id', findUserById);
router.post('/find-by-name', findUserByName);
router.post('/find-by-phone', findUserByPhone);




export default router;