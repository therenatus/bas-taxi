import express from 'express';
import { loginOrRegister, confirmLogin, loginOrRegisterWeb} from '../controllers/passanger.controller.js';

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

export default router;