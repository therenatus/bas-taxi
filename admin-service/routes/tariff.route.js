import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { validateMiddleware } from '../middlewares/validate.middleware.js';
import { authorizeRoles } from '../middlewares/role.middleware.js';
import { createTariffSchema } from '../validators/create-tariff.validator.js';
import {
    createTariff,
    getTariffs,
    deleteTariff,
    updateHourlyAdjustment,
    updateMonthlyAdjustment,
    addHoliday,
    deleteHoliday
} from '../controllers/tariff.controller.js';

const router = Router();

/**
 * @swagger
 * /admin/tariffs:
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
router.get('/tariffs/:cityId', authMiddleware, authorizeRoles(['superadmin', 'admin', 'moderator']), getTariffs);

/**
 * @swagger
 * /admin/tariffs:
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
router.post('/tariffs', authMiddleware, authorizeRoles(['superadmin', 'admin']), createTariff);

/**
 * @swagger
 * /admin/tariffs/{cityId}/{carClassId}:
 *   get:
 *     summary: Получить тариф по городу и классу автомобиля
 *     tags: [Admin, Tariff]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cityId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID города
 *       - in: path
 *         name: carClassId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID класса автомобиля
 *     responses:
 *       200:
 *         description: Тариф успешно получен
 *       404:
 *         description: Тариф не найден
 *       401:
 *         description: Неавторизованный доступ
 *       403:
 *         description: Доступ запрещен
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.get('/tariffs/:cityId/:carClassId', authMiddleware, authorizeRoles(['superadmin', 'admin', 'moderator']), getTariffs);

/**
 * @swagger
 * /admin/tariffs/{id}:
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
router.delete('/tariffs/:id', authMiddleware, authorizeRoles(['superadmin', 'admin']), deleteTariff);

/**
 * @swagger
 * /admin/tariffs/hour:
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
 *               - multiplier
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
router.put('/tariffs/hour', authMiddleware, authorizeRoles(['superadmin', 'admin']), updateHourlyAdjustment);

/**
 * @swagger
 * /admin/tariffs/month:
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
router.put('/tariffs/month', authMiddleware, authorizeRoles(['superadmin', 'admin']), updateMonthlyAdjustment);

/**
 * @swagger
 * /admin/tariffs/holiday:
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
router.post('/tariffs/holiday', authMiddleware, authorizeRoles(['superadmin', 'admin']), addHoliday);

/**
 * @swagger
 * /admin/tariffs/holiday:
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
router.delete('/tariffs/holiday', authMiddleware, authorizeRoles(['superadmin', 'admin']), deleteHoliday);

/**
 * @swagger
 * /tariffs/{cityId}:
 *   get:
 *     summary: Получение тарифов для города
 *     tags: [Tariffs]
 *     parameters:
 *       - in: path
 *         name: cityId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID города
 *     responses:
 *       200:
 *         description: Информация о тарифах
 *       404:
 *         description: Тарифы не найдены
 *       500:
 *         description: Ошибка сервера
 */
router.get('/:cityId', authMiddleware, authorizeRoles(['admin', 'superadmin']), getTariffs);

export default router; 