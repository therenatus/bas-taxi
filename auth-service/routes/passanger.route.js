import express from 'express';
import { registerPassenger, loginOrRegister, confirmLogin } from '../controllers/passanger.controller.js';

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

// /**
//  * @swagger
//  * /auth/passenger/register:
//  *   post:
//  *     summary: Регистрация пассажира
//  *     tags: [Passenger]
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
//  *                 example: "+1234567890"
//  *               fullName:
//  *                 type: string
//  *                 example: "Иван Иванов"
//  *     responses:
//  *       201:
//  *         description: Успешная регистрация
//  *       400:
//  *         description: Ошибка валидации
//  */
// router.post('/register', registerPassenger);