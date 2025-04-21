import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { validateMiddleware } from "../middlewares/validate.middleware.js";
import {
  addHoliday,
  deleteHoliday,
  updateBaseTariff,
  updateHoliday,
  updateHourAdjustment,
  updateMonthAdjustment,
} from "../services/tariff.service.js";
import {
  baseTariffSchema,
  deleteHolidaySchema,
  holidayAdjustmentSchema,
  hourAdjustmentSchema,
  monthAdjustmentSchema,
} from "../validators/tariff-adjustments.validator.js";

const router = Router();

/**
 * @swagger
 * /api/tariff/hour:
 *   put:
 *     summary: Обновить часовую корректировку тарифа
 *     tags: [Tariff]
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
 *               percent:
 *                 type: number
 *                 description: Процент корректировки (-100 до 500)
 *               reason:
 *                 type: string
 *                 description: Причина изменения
 *     responses:
 *       200:
 *         description: Часовая корректировка успешно обновлена
 *       400:
 *         description: Некорректные данные запроса
 *       401:
 *         description: Неавторизованный доступ
 *       404:
 *         description: Тариф не найден
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.put(
  "/hour",
  authMiddleware,
  validateMiddleware(hourAdjustmentSchema),
  async (req, res) => {
    try {
      const { cityId, carClassId, hour, percent, reason } = req.body;
      const adminId = req.user.id;

      const updatedTariff = await updateHourAdjustment(
        cityId,
        carClassId,
        hour,
        percent,
        adminId,
        reason
      );

      res.status(200).json({
        success: true,
        message: `Часовая корректировка для часа ${hour} успешно обновлена`,
        data: updatedTariff,
      });
    } catch (error) {
      res.status(error.status || 500).json({
        success: false,
        message:
          error.message ||
          "Произошла ошибка при обновлении часовой корректировки тарифа",
      });
    }
  }
);

/**
 * @swagger
 * /api/tariff/month:
 *   put:
 *     summary: Обновить месячную корректировку тарифа
 *     tags: [Tariff]
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
 *               - percent
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
 *               percent:
 *                 type: number
 *                 description: Процент корректировки (-100 до 500)
 *               reason:
 *                 type: string
 *                 description: Причина изменения
 *     responses:
 *       200:
 *         description: Месячная корректировка успешно обновлена
 *       400:
 *         description: Некорректные данные запроса
 *       401:
 *         description: Неавторизованный доступ
 *       404:
 *         description: Тариф не найден
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.put(
  "/month",
  authMiddleware,
  validateMiddleware(monthAdjustmentSchema),
  async (req, res) => {
    try {
      const { cityId, carClassId, month, percent, reason } = req.body;
      const adminId = req.user.id;

      const updatedTariff = await updateMonthAdjustment(
        cityId,
        carClassId,
        month,
        percent,
        adminId,
        reason
      );

      res.status(200).json({
        success: true,
        message: `Месячная корректировка для месяца ${month} успешно обновлена`,
        data: updatedTariff,
      });
    } catch (error) {
      res.status(error.status || 500).json({
        success: false,
        message:
          error.message ||
          "Произошла ошибка при обновлении месячной корректировки тарифа",
      });
    }
  }
);

/**
 * @swagger
 * /api/tariff/holiday:
 *   post:
 *     summary: Добавить праздничный день
 *     tags: [Tariff]
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
 *               - percent
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
 *                 description: День (1-31)
 *                 minimum: 1
 *                 maximum: 31
 *               percent:
 *                 type: number
 *                 description: Процент корректировки (-100 до 500)
 *               reason:
 *                 type: string
 *                 description: Причина изменения
 *     responses:
 *       201:
 *         description: Праздничный день успешно добавлен
 *       400:
 *         description: Некорректные данные запроса
 *       401:
 *         description: Неавторизованный доступ
 *       404:
 *         description: Тариф не найден
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.post(
  "/holiday",
  authMiddleware,
  validateMiddleware(holidayAdjustmentSchema),
  async (req, res) => {
    try {
      const { cityId, carClassId, month, day, percent, reason } = req.body;
      const adminId = req.user.id;

      const updatedTariff = await addHoliday(
        cityId,
        carClassId,
        month,
        day,
        percent,
        adminId,
        reason
      );

      res.status(201).json({
        success: true,
        message: `Праздничный день ${day}.${month} успешно добавлен`,
        data: updatedTariff,
      });
    } catch (error) {
      res.status(error.status || 500).json({
        success: false,
        message:
          error.message || "Произошла ошибка при добавлении праздничного дня",
      });
    }
  }
);

/**
 * @swagger
 * /api/tariff/holiday:
 *   put:
 *     summary: Обновить праздничный день
 *     tags: [Tariff]
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
 *               - percent
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
 *                 description: День (1-31)
 *                 minimum: 1
 *                 maximum: 31
 *               percent:
 *                 type: number
 *                 description: Процент корректировки (-100 до 500)
 *               reason:
 *                 type: string
 *                 description: Причина изменения
 *     responses:
 *       200:
 *         description: Праздничный день успешно обновлен
 *       400:
 *         description: Некорректные данные запроса
 *       401:
 *         description: Неавторизованный доступ
 *       404:
 *         description: Тариф или праздничный день не найден
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.put(
  "/holiday",
  authMiddleware,
  validateMiddleware(holidayAdjustmentSchema),
  async (req, res) => {
    try {
      const { cityId, carClassId, month, day, percent, reason } = req.body;
      const adminId = req.user.id;

      const updatedTariff = await updateHoliday(
        cityId,
        carClassId,
        month,
        day,
        percent,
        adminId,
        reason
      );

      res.status(200).json({
        success: true,
        message: `Праздничный день ${day}.${month} успешно обновлен`,
        data: updatedTariff,
      });
    } catch (error) {
      res.status(error.status || 500).json({
        success: false,
        message:
          error.message || "Произошла ошибка при обновлении праздничного дня",
      });
    }
  }
);

/**
 * @swagger
 * /api/tariff/holiday:
 *   delete:
 *     summary: Удалить праздничный день
 *     tags: [Tariff]
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
 *                 description: День (1-31)
 *                 minimum: 1
 *                 maximum: 31
 *               reason:
 *                 type: string
 *                 description: Причина удаления
 *     responses:
 *       200:
 *         description: Праздничный день успешно удален
 *       400:
 *         description: Некорректные данные запроса
 *       401:
 *         description: Неавторизованный доступ
 *       404:
 *         description: Тариф или праздничный день не найден
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.delete(
  "/holiday",
  authMiddleware,
  validateMiddleware(deleteHolidaySchema),
  async (req, res) => {
    try {
      const { cityId, carClassId, month, day, reason } = req.body;
      const adminId = req.user.id;

      const updatedTariff = await deleteHoliday(
        cityId,
        carClassId,
        month,
        day,
        adminId,
        reason
      );

      res.status(200).json({
        success: true,
        message: `Праздничный день ${day}.${month} успешно удален`,
        data: updatedTariff,
      });
    } catch (error) {
      res.status(error.status || 500).json({
        success: false,
        message:
          error.message || "Произошла ошибка при удалении праздничного дня",
      });
    }
  }
);

/**
 * @swagger
 * /api/tariff/base:
 *   put:
 *     summary: Обновить базовый тариф
 *     tags: [Tariff]
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
 *               reason:
 *                 type: string
 *                 description: Причина изменения
 *     responses:
 *       200:
 *         description: Базовый тариф успешно обновлен
 *       400:
 *         description: Некорректные данные запроса
 *       401:
 *         description: Неавторизованный доступ
 *       404:
 *         description: Тариф не найден
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.put(
  "/base",
  authMiddleware,
  validateMiddleware(baseTariffSchema),
  async (req, res) => {
    try {
      const { cityId, carClassId, baseFare, costPerKm, costPerMinute, reason } =
        req.body;
      const adminId = req.user.id;

      const updatedTariff = await updateBaseTariff(
        cityId,
        carClassId,
        baseFare,
        costPerKm,
        costPerMinute,
        adminId,
        reason
      );

      res.status(200).json({
        success: true,
        message: "Базовый тариф успешно обновлен",
        data: updatedTariff,
      });
    } catch (error) {
      res.status(error.status || 500).json({
        success: false,
        message:
          error.message || "Произошла ошибка при обновлении базового тарифа",
      });
    }
  }
);

export default router;
