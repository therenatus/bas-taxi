import { Router } from "express";
import {
  approveDriver,
  blockDriverViaGateway,
  blockUserViaGateway,
  createAdmin,
  getAdminById,
  getDriverDetails,
  getDriverRequests,
  getDriverRidesViaGateway,
  getDrivers,
  getReviews,
  getRides,
  getRidesByTimeRange,
  getUserRidesViaGateway,
  getUsers,
  rejectDriver,
  unblockDriverViaGateway,
  unblockUserViaGateway,
} from "../controllers/admin.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/role.middleware.js";
import { validateMiddleware } from "../middlewares/validate.middleware.js";
import { rejectDriverSchema } from "../validators/reject-driver.js";
import tariffRouter from "./tariff.route.js";

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
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Номер страницы для пагинации
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Количество пользователей на странице
 *     responses:
 *       200:
 *         description: Список пользователей успешно получен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 passengers:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 meta:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       401:
 *         description: Неавторизованный доступ
 *       403:
 *         description: Доступ запрещен
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.get(
  "/users",
  authMiddleware,
  authorizeRoles(["superadmin", "admin", "moderator"]),
  getUsers
);

/**
 * @swagger
 * /admin/drivers:
 *   get:
 *     summary: Получить список водителей
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Номер страницы для пагинации
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Количество водителей на странице
 *     responses:
 *       200:
 *         description: Список водителей успешно получен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 drivers:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Driver'
 *                 meta:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       401:
 *         description: Неавторизованный доступ
 *       403:
 *         description: Доступ запрещен
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.get(
  "/drivers",
  authMiddleware,
  authorizeRoles(["superadmin", "admin", "moderator"]),
  getDrivers
);

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
router.get(
  "/driver-requests",
  authMiddleware,
  authorizeRoles(["superadmin", "admin", "moderator"]),
  getDriverRequests
);
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

router.get(
  "/driver/:id",
  authMiddleware,
  authorizeRoles(["superadmin", "admin", "moderator"]),
  getDriverDetails
);
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
router.post(
  "/approve-driver/:requestId",
  authMiddleware,
  authorizeRoles(["superadmin", "admin", "moderator"]),
  approveDriver
);
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
  "/approve-driver",
  authMiddleware,
  authorizeRoles(["superadmin", "admin", "moderator"]),
  approveDriver
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
router.post(
  "/reject-driver/:requestId",
  authMiddleware,
  authorizeRoles(["superadmin", "admin", "moderator"]),
  validateMiddleware(rejectDriverSchema),
  rejectDriver
);
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
router.get(
  "/rides",
  authMiddleware,
  authorizeRoles(["superadmin", "admin", "moderator"]),
  getRides
);
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
router.get(
  "/reviews",
  authMiddleware,
  authorizeRoles(["superadmin", "admin", "moderator"]),
  getReviews
);
//router.get('/reviews', authMiddleware, authorizeRoles('admin', 'moderator'), getReviews);

/**
 * @swagger
 * /admin/user/{userId}/rides:
 *   get:
 *     summary: Получение списка поездок пользователя
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
 *         description: Данные о поездках получены
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Ride'
 *       400:
 *         description: Не указан userId
 *       404:
 *         description: Поездки с указанным userId не найдены
 *       500:
 *         description: Не удалось получить данные о поездках
 */
router.get(
  "/user/:userId/rides",
  authMiddleware,
  authorizeRoles(["superadmin", "admin", "moderator"]),
  getUserRidesViaGateway
);

/**
 * @swagger
 * /admin/driver/{driverId}/rides:
 *   get:
 *     summary: Получение списка поездок водителя
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
 *         description: Данные о поездках получены
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Ride'
 *       400:
 *         description: Не указан driverId
 *       404:
 *         description: Поездки с указанным driverId не найдены
 *       500:
 *         description: Не удалось получить данные о поездках
 */
router.get(
  "/driver/:driverId/rides",
  authMiddleware,
  authorizeRoles(["superadmin", "admin", "moderator"]),
  getDriverRidesViaGateway
);

/**
 * @swagger
 * /admin/rides:
 *   get:
 *     summary: Получение поездок по временному промежутку
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startTime
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Начало временного промежутка (ISO формат)
 *       - in: query
 *         name: endTime
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Конец временного промежутка (ISO формат)
 *     responses:
 *       200:
 *         description: Список поездок в указанном временном промежутке
 *       400:
 *         description: Некорректный запрос
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Доступ запрещен
 *       500:
 *         description: Ошибка сервера
 */
router.get(
  "/rides",
  authMiddleware,
  authorizeRoles(["superadmin", "admin"]),
  getRidesByTimeRange
);

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
// router.post('/create', authMiddleware, authorizeRoles(['superadmin']), validateMiddleware(createAdminSchema), createAdmin);
router.post(
  "/create",
  authMiddleware,
  authorizeRoles(["superadmin"]),
  createAdmin
);

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
router.get(
  "/:id",
  authMiddleware,
  authorizeRoles(["superadmin", "admin"]),
  getAdminById
);

/**
 * @swagger
 * /admin/user/{userId}/block:
 *   post:
 *     summary: Блокировка пассажира администратором
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: Идентификатор пассажира
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Причина блокировки
 *                 example: Нарушение правил сервиса
 *             required:
 *               - reason
 *     responses:
 *       200:
 *         description: Пассажир успешно заблокирован
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Пассажир успешно заблокирован
 *                 userInfo:
 *                   type: object
 *       400:
 *         description: Некорректные параметры запроса
 *       401:
 *         description: Неавторизованный доступ
 *       403:
 *         description: Доступ запрещен
 *       404:
 *         description: Пассажир не найден
 *       500:
 *         description: Ошибка сервера
 */
router.post(
  "/user/:userId/block",
  authMiddleware,
  authorizeRoles(["superadmin", "admin"]),
  blockUserViaGateway
);

/**
 * @swagger
 * /admin/driver/{driverId}/block:
 *   post:
 *     summary: Блокировка водителя администратором
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Причина блокировки
 *                 example: Нарушение правил сервиса
 *             required:
 *               - reason
 *     responses:
 *       200:
 *         description: Водитель успешно заблокирован
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Водитель успешно заблокирован
 *                 driverInfo:
 *                   type: object
 *       400:
 *         description: Некорректные параметры запроса
 *       401:
 *         description: Неавторизованный доступ
 *       403:
 *         description: Доступ запрещен
 *       404:
 *         description: Водитель не найден
 *       500:
 *         description: Ошибка сервера
 */
router.post(
  "/driver/:driverId/block",
  authMiddleware,
  authorizeRoles(["superadmin", "admin"]),
  blockDriverViaGateway
);

/**
 * @swagger
 * /admin/user/{userId}/unblock:
 *   post:
 *     summary: Разблокировка пассажира администратором
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: Идентификатор пассажира
 *     responses:
 *       200:
 *         description: Пассажир успешно разблокирован
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Пассажир успешно разблокирован
 *                 userInfo:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     phoneNumber:
 *                       type: string
 *                       example: "+1234567890"
 *                     isBlocked:
 *                       type: boolean
 *                       example: false
 *       400:
 *         description: Некорректные параметры запроса
 *       401:
 *         description: Неавторизованный доступ
 *       403:
 *         description: Доступ запрещен, недостаточно прав
 *       404:
 *         description: Пассажир не найден
 *       500:
 *         description: Ошибка сервера
 */
router.post(
  "/user/:userId/unblock",
  authMiddleware,
  authorizeRoles(["superadmin", "admin"]),
  unblockUserViaGateway
);

/**
 * @swagger
 * /admin/driver/{driverId}/unblock:
 *   post:
 *     summary: Разблокировка водителя администратором
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     description: Разблокирует ранее заблокированного водителя, что позволяет ему снова принимать заказы
 *     parameters:
 *       - in: path
 *         name: driverId
 *         required: true
 *         schema:
 *           type: string
 *         description: Идентификатор водителя
 *     responses:
 *       200:
 *         description: Водитель успешно разблокирован
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Водитель успешно разблокирован
 *                 driverInfo:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     phoneNumber:
 *                       type: string
 *                       example: "+1234567890"
 *                     isBlocked:
 *                       type: boolean
 *                       example: false
 *       400:
 *         description: Некорректные параметры запроса
 *       401:
 *         description: Неавторизованный доступ
 *       403:
 *         description: Доступ запрещен, недостаточно прав
 *       404:
 *         description: Водитель не найден
 *       500:
 *         description: Ошибка сервера
 */
router.post(
  "/driver/:driverId/unblock",
  authMiddleware,
  authorizeRoles(["superadmin", "admin"]),
  unblockDriverViaGateway
);

// Подключаем роутер для тарифов
router.use("/tariff", tariffRouter);

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

/**
 * @swagger
 * /admin/health:
 *   get:
 *     summary: Проверка работоспособности сервиса
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Сервис работает нормально
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 service:
 *                   type: string
 *                   example: admin-service
 */
router.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "admin-service" });
});

export default router;
