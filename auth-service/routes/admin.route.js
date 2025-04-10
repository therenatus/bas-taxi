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
 *     summary: Создание администратора или модератора с 2FA
 *     description: Суперадмин создает нового администратора и получает данные для передачи сотруднику, включая секретный ключ для настройки 2FA
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
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
 *                 description: Роль пользователя (admin, moderator, financier)
 *                 example: "admin"
 *               city:
 *                 type: string
 *                 description: Город (обязателен для модераторов)
 *                 example: "Алматы"
 *     responses:
 *       201:
 *         description: Пользователь успешно создан, данные для передачи сотруднику
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Аккаунт успешно создан"
 *                 admin:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     email:
 *                       type: string
 *                       example: "admin@example.com"
 *                     password:
 *                       type: string
 *                       description: Нешифрованный пароль для передачи
 *                       example: "password123"
 *                     role:
 *                       type: string
 *                       example: "admin"
 *                     city:
 *                       type: string
 *                       example: "Алматы"
 *                     twoFactorSecret:
 *                       type: string
 *                       description: Ключ для настройки 2FA в приложении
 *                       example: "JBSWY3DPEHPK3PXP"
 *                     createdAt:
 *                       type: string
 *                       example: "2023-05-01T10:30:00.000Z"
 *       400:
 *         description: Ошибка валидации
 *       401:
 *         description: Требуется авторизация
 *       403:
 *         description: Недостаточно прав (требуется роль superadmin)
 */
router.post('/create', authMiddleware, superAdminMiddleware, validateMiddleware(createAdminSchema), createAdmin);

/**
 * @swagger
 * /auth/admin/login:
 *   post:
 *     summary: Вход администратора с обязательной 2FA
 *     description: Авторизация администратора с проверкой email, пароля и кода из Google Authenticator
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
 *                 description: 6-значный код из приложения Google Authenticator
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Успешный вход
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: JWT для дальнейшей аутентификации
 *                 role:
 *                   type: string
 *                   example: "admin"
 *                 city:
 *                   type: string
 *                   example: "Алматы"
 *       401:
 *         description: Неверный email, пароль или код 2FA
 */
router.post('/login', validateMiddleware(adminLoginSchema), loginAdmin);

/**
 * @swagger
 * /auth/admin/{id}:
 *   get:
 *     summary: Получить информацию об администраторе по ID
 *     description: Получение данных администратора по его ID (требуется авторизация)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   example: 1
 *                 email:
 *                   type: string
 *                   example: "admin@example.com"
 *                 role:
 *                   type: string
 *                   example: "admin"
 *                 city:
 *                   type: string
 *                   example: "Алматы"
 *                 createdAt:
 *                   type: string
 *                   example: "2023-05-01T10:30:00.000Z"
 *       401:
 *         description: Требуется авторизация
 *       404:
 *         description: Администратор не найден
 */
router.get('/:id', authMiddleware, getAdminById);

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

export default router;