import express from 'express';
import { loginAdmin } from "../controllers/admin.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import validateMiddleware from "../middlewares/validate.middleware.js";
import { adminLoginSchema } from "../validators/login.validator.js";

const router = express.Router();

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
 * /admin/create:
 *   post:
 *     summary: Создание администратора или модератора с 2FA по умолчанию (проксируется в admin-service)
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
// Маршрут перенесен в admin-service, к нему можно обратиться через API-gateway

/**
 * @swagger
 * /admin/{id}:
 *   get:
 *     summary: Получить информацию об администраторе по ID (проксируется в admin-service)
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
// Маршрут перенесен в admin-service, к нему можно обратиться через API-gateway

export default router;