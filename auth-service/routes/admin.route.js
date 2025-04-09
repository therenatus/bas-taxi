import express from 'express';
import { createAdmin, loginAdmin, getAdminById } from "../controllers/admin.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { superAdminMiddleware } from "../middlewares/admin.guard.js";
import validateMiddleware from "../middlewares/validate.middleware.js";
import { createAdminSchema } from "../validators/admin.validator.js";
import { adminLoginSchema } from "../validators/login.validator.js";

const router = express.Router();

/**
 * @swagger
 * /auth/admin/create:
 *   post:
 *     summary: Создание администратора или модератора с 2FA по умолчанию
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *                 description: Уникальный email администратора
 *                 example: "admin@example.com"
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
 *         description: Пользователь успешно создан, 2FA активирована
 *       400:
 *         description: Ошибка валидации
 *       403:
 *         description: Доступ запрещен
 */
router.post('/create', authMiddleware, superAdminMiddleware, validateMiddleware(createAdminSchema), createAdmin);

/**
 * @swagger
 * /auth/admin/login:
 *   post:
 *     summary: Вход администратора с обязательной 2FA
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - twoFactorToken
 *             properties:
 *               email:
 *                 type: string
 *                 description: Email администратора
 *                 example: "admin@example.com"
 *               password:
 *                 type: string
 *                 description: Пароль
 *                 example: "password123"
 *               twoFactorToken:
 *                 type: string
 *                 description: 6-значный код из приложения-аутентификатора
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Успешный вход
 *       401:
 *         description: Неверный email, пароль или код 2FA
 */
router.post('/login', validateMiddleware(adminLoginSchema), loginAdmin);

/**
 * @swagger
 * /auth/admin/{id}:
 *   get:
 *     summary: Получить информацию об администраторе по ID
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID администратора
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Успешный ответ
 *       404:
 *         description: Администратор не найден
 *       403:
 *         description: Доступ запрещен
 */
router.get('/:id', authMiddleware, getAdminById);

export default router;