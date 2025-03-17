import express from "express";
import {loginOrRegisterWeb} from "../controllers/passanger.controller.js";

const router = express.Router();


/**
 * @swagger
 * /auth/wev/login:
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

router.post('/login', loginOrRegisterWeb);

export default router;