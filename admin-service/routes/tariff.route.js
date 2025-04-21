import { Router } from "express";
import {
  addHoliday,
  createHourlyAdjustment,
  createTariff,
  deleteHoliday,
  deleteTariff,
  getCarClasses,
  getCities,
  getTariffs,
  updateHourlyAdjustment,
  updateMonthlyAdjustment,
  updateSettings,
} from "../controllers/tariff.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/role.middleware.js";
import { validateMiddleware } from "../middlewares/validate.middleware.js";
import { updateCostSchema } from "../validators/update-cost.validator.js";

const router = Router();

/**
 * @swagger
 * /admin/tariff:
 *   post:
 *     summary: Создать новый тариф
 *     tags: [Admin, Tariff]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - cityId
 *               - carClassId
 *               - baseFare
 *               - costPerKm
 *               - costPerMinute
 *             properties:
 *               cityId:
 *                 type: integer
 *                 description: ID города
 *               carClassId:
 *                 type: integer
 *                 description: ID класса автомобиля
 *               baseFare:
 *                 type: number
 *                 description: Базовая стоимость поездки
 *               costPerKm:
 *                 type: number
 *                 description: Стоимость за километр
 *               costPerMinute:
 *                 type: number
 *                 description: Стоимость за минуту
 *               seasonalMultiplier:
 *                 type: number
 *                 description: Сезонный множитель (по умолчанию 1.0)
 *     responses:
 *       201:
 *         description: Тариф успешно создан
 *       400:
 *         description: Неверные данные запроса
 *       401:
 *         description: Неавторизованный доступ
 *       403:
 *         description: Доступ запрещен
 *       500:
 *         description: Внутренняя ошибка сервера
 */
//router.post('/tariffs', authMiddleware, authorizeRoles(['superadmin', 'admin']), validateMiddleware(createTariffSchema), createTariff);
router.post(
  "/",
  authMiddleware,
  authorizeRoles(["superadmin", "admin"]),
  createTariff
);

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
router.put(
  "/tariff",
  authMiddleware,
  authorizeRoles(["superadmin", "admin", "moderator"]),
  validateMiddleware(updateCostSchema),
  updateSettings
);

/**
 * @swagger
 * /admin/tariff/{id}:
 *   delete:
 *     summary: Удалить тариф
 *     tags: [Admin, Tariff]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID тарифа
 *     responses:
 *       200:
 *         description: Тариф успешно удален
 *       404:
 *         description: Тариф не найден
 *       401:
 *         description: Неавторизованный доступ
 *       403:
 *         description: Доступ запрещен
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.delete(
  "/:id",
  authMiddleware,
  authorizeRoles(["superadmin", "admin"]),
  deleteTariff
);

/**
 * @swagger
 * /admin/tariff/hour:
 *   put:
 *     summary: Обновить почасовой коэффициент для тарифа
 *     tags: [Admin, Tariff]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - cityId
 *               - carClassId
 *               - hour
 *               - percent
 *             properties:
 *               cityId:
 *                 type: integer
 *                 description: ID города
 *               carClassId:
 *                 type: integer
 *                 description: ID класса автомобиля
 *               hour:
 *                 type: integer
 *                 description: Час (0-23)
 *                 minimum: 0
 *                 maximum: 23
 *               multiplier:
 *                 type: number
 *                 description: Коэффициент для указанного часа
 *     responses:
 *       200:
 *         description: Почасовой коэффициент успешно обновлен
 *       400:
 *         description: Неверные данные запроса
 *       401:
 *         description: Неавторизованный доступ
 *       403:
 *         description: Доступ запрещен
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.put(
  "/hour",
  authMiddleware,
  authorizeRoles(["superadmin", "admin"]),
  updateHourlyAdjustment
);

/**
 * @swagger
 * /admin/tariff/hour:
 *   post:
 *     summary: Создать почасовой коэффициент для тарифа
 *     tags: [Admin, Tariff]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - cityId
 *               - carClassId
 *               - hour
 *               - percent
 *             properties:
 *               cityId:
 *                 type: integer
 *                 description: ID города
 *               carClassId:
 *                 type: integer
 *                 description: ID класса автомобиля
 *               hour:
 *                 type: integer
 *                 description: Час (0-23)
 *                 minimum: 0
 *                 maximum: 23
 *               multiplier:
 *                 type: number
 *                 description: Коэффициент для указанного часа
 *     responses:
 *       201:
 *         description: Почасовой коэффициент успешно создан
 *       400:
 *         description: Неверные данные запроса
 *       401:
 *         description: Неавторизованный доступ
 *       403:
 *         description: Доступ запрещен
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.post(
  "/hour",
  authMiddleware,
  authorizeRoles(["superadmin", "admin"]),
  createHourlyAdjustment
);

/**
 * @swagger
 * /admin/tariff/month:
 *   put:
 *     summary: Обновить сезонный коэффициент для тарифа
 *     tags: [Admin, Tariff]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - cityId
 *               - carClassId
 *               - month
 *               - multiplier
 *             properties:
 *               cityId:
 *                 type: integer
 *                 description: ID города
 *               carClassId:
 *                 type: integer
 *                 description: ID класса автомобиля
 *               month:
 *                 type: integer
 *                 description: Месяц (1-12)
 *                 minimum: 1
 *                 maximum: 12
 *               multiplier:
 *                 type: number
 *                 description: Коэффициент для указанного месяца
 *     responses:
 *       200:
 *         description: Сезонный коэффициент успешно обновлен
 *       400:
 *         description: Неверные данные запроса
 *       401:
 *         description: Неавторизованный доступ
 *       403:
 *         description: Доступ запрещен
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.put(
  "/month",
  authMiddleware,
  authorizeRoles(["superadmin", "admin"]),
  updateMonthlyAdjustment
);

/**
 * @swagger
 * /admin/tariff/holiday:
 *   post:
 *     summary: Добавить праздничный день с коэффициентом
 *     tags: [Admin, Tariff]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - cityId
 *               - carClassId
 *               - month
 *               - day
 *               - multiplier
 *               - name
 *             properties:
 *               cityId:
 *                 type: integer
 *                 description: ID города
 *               carClassId:
 *                 type: integer
 *                 description: ID класса автомобиля
 *               month:
 *                 type: integer
 *                 description: Месяц (1-12)
 *                 minimum: 1
 *                 maximum: 12
 *               day:
 *                 type: integer
 *                 description: День месяца (1-31)
 *                 minimum: 1
 *                 maximum: 31
 *               multiplier:
 *                 type: number
 *                 description: Праздничный коэффициент
 *               name:
 *                 type: string
 *                 description: Название праздника
 *     responses:
 *       201:
 *         description: Праздничный день успешно добавлен
 *       400:
 *         description: Неверные данные запроса
 *       401:
 *         description: Неавторизованный доступ
 *       403:
 *         description: Доступ запрещен
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.post(
  "/holiday",
  authMiddleware,
  authorizeRoles(["superadmin", "admin"]),
  addHoliday
);

/**
 * @swagger
 * /admin/tariff/holiday:
 *   delete:
 *     summary: Удалить праздничный день
 *     tags: [Admin, Tariff]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - cityId
 *               - carClassId
 *               - month
 *               - day
 *             properties:
 *               cityId:
 *                 type: integer
 *                 description: ID города
 *               carClassId:
 *                 type: integer
 *                 description: ID класса автомобиля
 *               month:
 *                 type: integer
 *                 description: Месяц (1-12)
 *                 minimum: 1
 *                 maximum: 12
 *               day:
 *                 type: integer
 *                 description: День месяца (1-31)
 *                 minimum: 1
 *                 maximum: 31
 *     responses:
 *       200:
 *         description: Праздничный день успешно удален
 *       400:
 *         description: Неверные данные запроса
 *       401:
 *         description: Неавторизованный доступ
 *       403:
 *         description: Доступ запрещен
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.delete(
  "/holiday",
  authMiddleware,
  authorizeRoles(["superadmin", "admin"]),
  deleteHoliday
);

/**
 * @swagger
 * /admin/tariff/cities:
 *   get:
 *     summary: Получить список городов
 *     tags: [Admin, Tariff]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список городов успешно получен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 cities:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *       401:
 *         description: Неавторизованный доступ
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.get(
  "/cities",
  authMiddleware,
  authorizeRoles(["superadmin", "admin", "moderator"]),
  getCities
);

/**
 * @swagger
 * /admin/tariff/car-classes:
 *   get:
 *     summary: Получить список классов автомобилей
 *     tags: [Admin, Tariff]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список классов автомобилей успешно получен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 carClasses:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *       401:
 *         description: Неавторизованный доступ
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.get(
  "/car-classes",
  authMiddleware,
  authorizeRoles(["superadmin", "admin", "moderator"]),
  getCarClasses
);

/**
 * @swagger
 * /admin/tariff/{cityId}:
 *   get:
 *     summary: Получить все тарифы
 *     tags: [Admin, Tariff]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список тарифов успешно получен
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Tariff'
 *       401:
 *         description: Неавторизованный доступ
 *       403:
 *         description: Доступ запрещен
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.get(
  "/:cityId",
  authMiddleware,
  authorizeRoles(["superadmin", "admin", "moderator"]),
  getTariffs
);

export default router;
