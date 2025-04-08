import express from 'express';
import { authMiddleware } from "../middlewares/auth.middleware.js";

export const createChatRoutes = ({ chatController }) => {
    const router = express.Router();

    /**
     * @swagger
     * /chats:
     *   get:
     *     summary: Получение истории чата
     *     tags: [Chat]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: query
     *         name: rideId
     *         required: true
     *         schema:
     *           type: string
     *         description: ID поездки
     *     responses:
     *       200:
     *         description: История успешно получена
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 chatId:
     *                   type: string
     *                   example: "chat123"
     *                 messages:
     *                   type: array
     *                   items:
     *                     type: object
     *                     properties:
     *                       senderId:
     *                         type: string
     *                         example: "user1"
     *                       text:
     *                         type: string
     *                         example: "Привет, как дела?"
     *                       timestamp:
     *                         type: string
     *                         format: date-time
     *                         example: "2025-03-18T12:34:56.789Z"
     *       401:
     *         description: Неавторизованный доступ
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 error:
     *                   type: string
     *                   example: "Unauthorized"
     *       500:
     *         description: Внутренняя ошибка сервера
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 error:
     *                   type: object
     *                   properties:
     *                     code:
     *                       type: string
     *                       example: "INTERNAL_ERROR"
     *                     message:
     *                       type: string
     *                       example: "Internal server error"
     */
    router.get("/", authMiddleware(["admin", "superadmin"]), chatController.getChatHistory);

    /**
     * @swagger
     * /chats/my:
     *   get:
     *     summary: Получение чата пользователя
     *     tags: [Chat]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Чат успешно получен
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 chatId:
     *                   type: string
     *                   example: "chat456"
     *                 messages:
     *                   type: array
     *                   items:
     *                     type: object
     *                     properties:
     *                       senderId:
     *                         type: string
     *                         example: "user2"
     *                       text:
     *                         type: string
     *                         example: "Здравствуйте!"
     *                       timestamp:
     *                         type: string
     *                         format: date-time
     *                         example: "2025-03-18T13:45:00.000Z"
     *       401:
     *         description: Неавторизованный доступ
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 error:
     *                   type: string
     *                   example: "Unauthorized"
     *       500:
     *         description: Внутренняя ошибка сервера
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 error:
     *                   type: object
     *                   properties:
     *                     code:
     *                       type: string
     *                       example: "INTERNAL_ERROR"
     *                     message:
     *                       type: string
     *                       example: "Internal server error"
     */
    router.get("/my", authMiddleware(["driver", "passenger", "admin"]), chatController.getMyChat);

    /**
     * @swagger
     * /chats:
     *   post:
     *     summary: Отправка сообщения
     *     tags: [Chat]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               senderId:
     *                 type: string
     *                 example: "user1"
     *               receiverId:
     *                 type: string
     *                 example: "user2"
     *               rideId:
     *                 type: string
     *                 example: "ride123"
     *               text:
     *                 type: string
     *                 example: "Привет, это тестовое сообщение"
     *     responses:
     *       201:
     *         description: Сообщение успешно отправлено
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 messageId:
     *                   type: string
     *                   example: "msg123"
     *                 status:
     *                   type: string
     *                   example: "sent"
     *       401:
     *         description: Неавторизованный доступ
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 error:
     *                   type: string
     *                   example: "Unauthorized"
     *       500:
     *         description: Внутренняя ошибка сервера
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 error:
     *                   type: object
     *                   properties:
     *                     code:
     *                       type: string
     *                       example: "INTERNAL_ERROR"
     *                     message:
     *                       type: string
     *                       example: "Internal server error"
     */
    router.post("/", authMiddleware(["driver", "passenger", "admin"]), chatController.sendMessage);

    /**
     * @swagger
     * /chats/driver-admin:
     *   post:
     *     summary: Создание чата между водителем и администратором
     *     tags: [Chat]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               driverId:
     *                 type: string
     *                 example: "123"
     *               adminId:
     *                 type: string
     *                 example: "456"
     *     responses:
     *       201:
     *         description: Чат успешно создан
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 chatId:
     *                   type: string
     *                   example: "chat789"
     *                 type:
     *                   type: string
     *                   example: "driver_admin"
     *                 participants:
     *                   type: array
     *                   items:
     *                     type: string
     *                   example: ["driver:123", "admin:456"]
     *       401:
     *         description: Неавторизованный доступ
     *       500:
     *         description: Внутренняя ошибка сервера
     */
    router.post("/driver-admin", authMiddleware(["admin"]), chatController.createDriverAdminChat);

    /**
     * @swagger
     * /chats/driver-admin:
     *   get:
     *     summary: Получение списка чатов между водителем и администратором
     *     tags: [Chat]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Список чатов успешно получен
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 type: object
     *                 properties:
     *                   id:
     *                     type: string
     *                     example: "chat789"
     *                   participantIds:
     *                     type: array
     *                     items:
     *                       type: string
     *                     example: ["driver:123", "admin:456"]
     *                   createdAt:
     *                     type: string
     *                     format: date-time
     *       401:
     *         description: Неавторизованный доступ
     *       500:
     *         description: Внутренняя ошибка сервера
     */
    router.get("/driver-admin", authMiddleware(["driver", "admin"]), chatController.getDriverAdminChats);

    /**
     * @swagger
     * /chats/passenger-admin:
     *   post:
     *     summary: Создание чата между пассажиром и администратором
     *     tags: [Chat]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               passengerId:
     *                 type: string
     *                 example: "123"
     *               adminId:
     *                 type: string
     *                 example: "456"
     *     responses:
     *       201:
     *         description: Чат успешно создан
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 chatId:
     *                   type: string
     *                   example: "chat789"
     *                 type:
     *                   type: string
     *                   example: "passenger_admin"
     *                 participants:
     *                   type: array
     *                   items:
     *                     type: string
     *                   example: ["passenger:123", "admin:456"]
     *       401:
     *         description: Неавторизованный доступ
     *       500:
     *         description: Внутренняя ошибка сервера
     */
    router.post("/passenger-admin", authMiddleware(["admin", "passenger"]), chatController.createPassengerAdminChat);

    /**
     * @swagger
     * /chats/passenger-admin:
     *   get:
     *     summary: Получение списка чатов между пассажиром и администратором
     *     tags: [Chat]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Список чатов успешно получен
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 type: object
     *                 properties:
     *                   id:
     *                     type: string
     *                     example: "chat789"
     *                   participantIds:
     *                     type: array
     *                     items:
     *                       type: string
     *                     example: ["passenger:123", "admin:456"]
     *                   createdAt:
     *                     type: string
     *                     format: date-time
     *       401:
     *         description: Неавторизованный доступ
     *       500:
     *         description: Внутренняя ошибка сервера
     */
    router.get("/passenger-admin", authMiddleware(["passenger", "admin"]), chatController.getPassengerAdminChats);

    /**
     * @swagger
     * /chats/group:
     *   post:
     *     summary: Создание группового чата
     *     tags: [Chat]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               name:
     *                 type: string
     *                 example: "Групповой чат поддержки"
     *               participantIds:
     *                 type: array
     *                 items:
     *                   type: string
     *                 example: ["driver:123", "admin:456", "passenger:789"]
     *     responses:
     *       201:
     *         description: Чат успешно создан
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 chatId:
     *                   type: string
     *                   example: "chat789"
     *                 type:
     *                   type: string
     *                   example: "group"
     *       401:
     *         description: Неавторизованный доступ
     *       500:
     *         description: Внутренняя ошибка сервера
     */
    router.post("/group", authMiddleware(["admin"]), chatController.createGroupChat);

    return router;
};
