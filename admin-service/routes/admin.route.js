import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { validateMiddleware } from '../middlewares/validate.middleware.js';
import {
    getUsers,
    approveDriver,
    getRides,
    getReviews,
    updateSettings, getDriverRequests, rejectDriver, getDriverDetails, getUserRidesViaGateway, getDriverRidesViaGateway,
    createAdmin,
    getAdminById
} from '../controllers/admin.controller.js';
import {rejectDriverSchema} from "../validators/reject-driver.js";
import {updateCostSchema} from "../validators/update-cost.validator.js";
import {authorizeRoles} from "../middlewares/role.middleware.js";
import DriverRequest from "../models/driver-request.model.js";
import tariffRouter from './tariff.route.js';
import { createAdminSchema } from '../validators/admin.validator.js';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Ride:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         passengerId:
 *           type: integer
 *           nullable: true
 *         driverId:
 *           type: integer
 *           nullable: true
 *         origin:
 *           type: string
 *         destination:
 *           type: string
 *         originName:
 *           type: string
 *           nullable: true
 *         destinationName:
 *           type: string
 *           nullable: true
 *         city:
 *           type: string
 *         distance:
 *           type: number
 *           nullable: true
 *         price:
 *           type: number
 *           nullable: true
 *         paymentType:
 *           type: string
 *           enum: [cash, card]
 *         status:
 *           type: string
 *           enum: [pending, driver_assigned, in_progress, completed, cancelled, on_site]
 *         cancellationReason:
 *           type: string
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: Получить список пользователей
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список пользователей успешно получен
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       401:
 *         description: Неавторизованный доступ
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Доступ запрещен
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Внутренняя ошибка сервера
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/users', authMiddleware, authorizeRoles(['superadmin', 'admin', 'moderator']) , getUsers);
//router.get('/users', authMiddleware, authorizeRoles('admin', 'moderator'), getUsers);

/**
 * @swagger
 * /admin/driver-requests:
 *   get:
 *     summary: Получить список заявок водителей со статусом "pending"
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список заявок водителей успешно получен
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/DriverRequest'
 *       401:
 *         description: Неавторизованный доступ
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Доступ запрещен
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Внутренняя ошибка сервера
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/driver-requests',authMiddleware, authorizeRoles(['superadmin', 'admin', 'moderator']), getDriverRequests);
//router.get('/driver-requests', authMiddleware, authorizeRoles('admin', 'moderator'), getDriverRequests);

/**
 * @swagger
 * /admin/driver/{id}:
 *   get:
 *     summary: Получить данные о водителе
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Идентификатор водителя
 *     responses:
 *       200:
 *         description: Данные водителя успешно получены
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DriverDetails'
 *       404:
 *         description: Водитель не найден
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Водитель не найден"
 *       500:
 *         description: Внутренняя ошибка сервера
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Ошибка при получении данных водителя"
 */


router.get('/driver/:id', authMiddleware, authorizeRoles(['superadmin', 'admin', 'moderator']), getDriverDetails);
// router.get('/driver/:id', authMiddleware, authorizeRoles('admin', 'moderator'), getDriverDetails);

/**
 * @swagger
 * /admin/approve-driver/{requestId}:
 *   post:
 *     summary: Одобрить заявку водителя
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Идентификатор заявки водителя
 *     responses:
 *       200:
 *         description: Водитель успешно одобрен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Водитель успешно одобрен"
 *       400:
 *         description: Заявка уже обработана или неверные параметры
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Заявка водителя не найдена
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Внутренняя ошибка сервера
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/approve-driver/:requestId', authMiddleware, authorizeRoles(['superadmin', 'admin', 'moderator']), approveDriver);
//router.post('/approve-driver/:requestId', authMiddleware, authorizeRoles('admin', 'moderator'), approveDriver);

/**
 * @swagger
 * /admin/approve-driver:
 *   post:
 *     summary: Одобрить заявку водителя (без параметра)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Водитель успешно одобрен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Водитель успешно одобрен"
 *       400:
 *         description: Заявка уже обработана или неверные параметры
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Заявка водителя не найдена
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Внутренняя ошибка сервера
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
    '/approve-driver',authMiddleware, authorizeRoles(['superadmin', 'admin', 'moderator']), approveDriver
);

// router.post(
//     '/approve-driver',
//     authMiddleware,
//     authorizeRoles('admin', 'moderator'),
//     approveDriver
// );

/**
 * @swagger
 * /admin/reject-driver/{requestId}:
 *   post:
 *     summary: Отклонить заявку водителя
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Идентификатор заявки водителя
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RejectDriverRequest'
 *     responses:
 *       200:
 *         description: Водитель успешно отклонён
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Водитель успешно отклонён"
 *       400:
 *         description: Заявка уже обработана или неверные параметры
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Заявка водителя не найдена
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Ошибка при отклонении водителя
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/reject-driver/:requestId',authMiddleware, authorizeRoles(['superadmin', 'admin', 'moderator']),  validateMiddleware(rejectDriverSchema), rejectDriver);
//router.post('/reject-driver/:requestId', authMiddleware, authorizeRoles('admin', 'moderator'), validateMiddleware(rejectDriverSchema), rejectDriver);

/**
 * @swagger
 * /admin/rides:
 *   get:
 *     summary: Получить список всех поездок
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список поездок успешно получен
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Ride'
 *       401:
 *         description: Неавторизованный доступ
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Доступ запрещен
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Внутренняя ошибка сервера
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/rides',authMiddleware, authorizeRoles(['superadmin', 'admin', 'moderator']), getRides);
//router.get('/rides', authMiddleware, authorizeRoles('admin', 'moderator'), getRides);

/**
 * @swagger
 * /admin/reviews:
 *   get:
 *     summary: Получить список всех отзывов
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список отзывов успешно получен
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Review'
 *       401:
 *         description: Неавторизованный доступ
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Доступ запрещен
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Внутренняя ошибка сервера
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/reviews',authMiddleware, authorizeRoles(['superadmin', 'admin', 'moderator']), getReviews);
//router.get('/reviews', authMiddleware, authorizeRoles('admin', 'moderator'), getReviews);

/**
 * @swagger
 * /admin/tariff:
 *   post:
 *     summary: Обновить тарифы
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateSettingsRequest'
 *     responses:
 *       200:
 *         description: Тарифы успешно обновлены
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Тарифы успешно обновлены"
 */
router.post(
    '/tariff',
    authMiddleware, authorizeRoles(['superadmin', 'admin', 'moderator']),
    validateMiddleware(updateCostSchema),
    updateSettings
);

/**
 * @swagger
 * /admin/user/{userId}/rides:
 *   get:
 *     summary: Получить поездки пользователя через API Gateway
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: Идентификатор пользователя
 *     responses:
 *       200:
 *         description: Список поездок пользователя получен
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Ride'
 *       401:
 *         description: Неавторизованный доступ
 *       403:
 *         description: Доступ запрещен
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.get('/user/:userId/rides', authMiddleware, authorizeRoles(['superadmin', 'admin', 'moderator']), getUserRidesViaGateway);

/**
 * @swagger
 * /admin/driver/{driverId}/rides:
 *   get:
 *     summary: Получить поездки водителя через API Gateway
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: driverId
 *         required: true
 *         schema:
 *           type: string
 *         description: Идентификатор водителя
 *     responses:
 *       200:
 *         description: Список поездок водителя получен
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Ride'
 *       401:
 *         description: Неавторизованный доступ
 *       403:
 *         description: Доступ запрещен
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.get('/driver/:driverId/rides', authMiddleware, authorizeRoles(['superadmin', 'admin', 'moderator']), getDriverRidesViaGateway);

/**
 * @swagger
 * /admin/create:
 *   post:
 *     summary: Создание администратора или модератора с 2FA по умолчанию
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
router.post('/create', authMiddleware, authorizeRoles(['superadmin']), validateMiddleware(createAdminSchema), createAdmin);

/**
 * @swagger
 * /admin/{id}:
 *   get:
 *     summary: Получить информацию об администраторе по ID
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
 *       404:
 *         description: Администратор не найден
 *       403:
 *         description: Доступ запрещен
 */
router.get('/:id', authMiddleware, authorizeRoles(['superadmin', 'admin']), getAdminById);

// Подключаем роутер для тарифов
router.use('/', tariffRouter);

/**
 * @swagger
 * components:
 *   schemas:
 *     Tariff:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Уникальный идентификатор тарифа
 *         cityId:
 *           type: integer
 *           description: ID города
 *         carClassId:
 *           type: integer
 *           description: ID класса автомобиля
 *         baseFare:
 *           type: number
 *           description: Базовая стоимость поездки
 *         costPerKm:
 *           type: number
 *           description: Стоимость за километр
 *         costPerMinute:
 *           type: number
 *           description: Стоимость за минуту
 *         seasonalMultiplier:
 *           type: number
 *           description: Сезонный множитель
 *         hourlyAdjustments:
 *           type: object
 *           additionalProperties:
 *             type: number
 *           description: Почасовые коэффициенты (ключ - час, значение - коэффициент)
 *         monthlyAdjustments:
 *           type: object
 *           additionalProperties:
 *             type: number
 *           description: Месячные коэффициенты (ключ - месяц, значение - коэффициент)
 *         holidays:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               month:
 *                 type: integer
 *               day:
 *                 type: integer
 *               multiplier:
 *                 type: number
 *               name:
 *                 type: string
 *           description: Список праздничных дней с коэффициентами
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

export default router;
