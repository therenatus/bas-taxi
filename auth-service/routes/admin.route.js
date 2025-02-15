import express from 'express';
import {createAdmin, loginAdmin} from "../controllers/admin.controller.js";
import {authMiddleware} from "../middlewares/auth.middleware.js";
import {superAdminMiddleware} from "../middlewares/admin.guard.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Маршруты для администраторов
 */

/**
 * @swagger
 * /auth/admin/login:
 *   post:
 *     summary: Вход администратора
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: "admin"
 *               password:
 *                 type: string
 *                 example: "password123"
 *     responses:
 *       200:
 *         description: Успешный вход
 *       401:
 *         description: Неверные данные
 */
router.post('/login', loginAdmin);

/**
 * @swagger
 * /auth/admin/create:
 *   post:
 *     summary: Создание администратора или модератора
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *               - role
 *             properties:
 *               username:
 *                 type: string
 *                 description: Уникальный никнейм
 *                 example: "admin123"
 *               password:
 *                 type: string
 *                 description: Пароль
 *                 example: "password123"
 *               role:
 *                 type: string
 *                 description: Роль пользователя (admin или moderator)
 *                 example: "admin"
 *               city:
 *                 type: string
 *                 description: Город (обязателен для модераторов)
 *                 example: "Алматы"
 *     responses:
 *       201:
 *         description: Пользователь успешно создан
 *       400:
 *         description: Ошибка валидации
 *       403:
 *         description: Доступ запрещен
 */
router.post('/create', authMiddleware, superAdminMiddleware, createAdmin);




export default router;
