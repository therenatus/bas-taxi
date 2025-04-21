import express from "express";
import {
  acceptRideHandler,
  activateLineHandler,
  activateParkingModeHandler,
  addHolidayHandler,
  cancelRideHandler,
  cancelRideIfPassengerNotArrivedHandler,
  completeRideHandler,
  createRideWithoutPassengerHandler,
  createTariffHandler,
  deactivateLineHandler,
  deactivateParkingModeHandler,
  deleteHolidayHandler,
  deleteHourAdjustmentHandler,
  deleteMonthAdjustmentHandler,
  getAllUserRidesHandler,
  getCarClassesHandler,
  getCitiesHandler,
  getDriverBalanceHandler,
  getDriverDetailsHandler,
  getDriverRidesHandler,
  getNearbyParkedDriversHandler,
  getRideDetailsHandler,
  getRideInfoHandler,
  getRidesByTimeRange,
  getTariffHandler,
  getUserRidesHandler,
  onsiteRideHandler,
  requestRideHandler,
  startRideByQRHandler,
  startRideHandler,
  updateBaseTariffHandler,
  updateHolidayHandler,
  updateHourAdjustmentHandler,
  updateMonthAdjustmentHandler,
  updateRideStatusHandler,
} from "../controllers/ride.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Rides
 *   description: Управление поездками
 */

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
 * /rides/health:
 *   get:
 *     summary: Проверка работоспособности сервиса
 *     tags: [Rides]
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
 *                   example: ride-service
 */
router.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "ride-service" });
});

// ==================== Основные операции с поездками ====================

/**
 * @swagger
 * /rides/request:
 *   post:
 *     summary: Создание запроса на поездку от пассажира
 *     tags: [Rides]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               origin:
 *                 type: string
 *                 description: Координаты отправления в формате "lat,lng"
 *               destination:
 *                 type: string
 *                 description: Координаты назначения в формате "lat,lng"
 *     responses:
 *       201:
 *         description: Запрос на поездку создан
 *       400:
 *         description: Некорректный запрос
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.post(
  "/request",
  authMiddleware(["driver", "passenger"]),
  requestRideHandler
);

/**
 * @swagger
 * /rides/accept:
 *   post:
 *     summary: Принять поездку водителем
 *     tags: [Rides]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rideId:
 *                 type: integer
 *                 description: Идентификатор поездки
 *     responses:
 *       200:
 *         description: Поездка успешно принята
 *       400:
 *         description: Ошибка при принятии поездки
 */
router.post("/accept", authMiddleware(["driver"]), acceptRideHandler);

/**
 * @swagger
 * /rides/{rideId}/start:
 *   post:
 *     summary: Начало поездки после посадки пассажира
 *     tags: [Rides]
 *     parameters:
 *       - in: path
 *         name: rideId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Идентификатор поездки
 *     responses:
 *       200:
 *         description: Поездка успешно началась
 *       400:
 *         description: Ошибка запроса
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.post("/:rideId/start", authMiddleware(["driver"]), startRideHandler);

/**
 * @swagger
 * /rides/{rideId}/complete:
 *   post:
 *     summary: Завершение поездки водителем
 *     tags: [Rides]
 *     parameters:
 *       - in: path
 *         name: rideId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Идентификатор поездки
 *     responses:
 *       200:
 *         description: Поездка успешно завершена
 *       400:
 *         description: Ошибка запроса
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.post(
  "/:rideId/complete",
  authMiddleware(["driver"]),
  completeRideHandler
);

/**
 * @swagger
 * /rides/{rideId}/cancel:
 *   post:
 *     summary: Отмена поездки пассажиром
 *     tags: [Rides]
 *     parameters:
 *       - in: path
 *         name: rideId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Идентификатор поездки
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - cancellationReason
 *             properties:
 *               cancellationReason:
 *                 type: string
 *                 description: Причина отмены поездки
 *     responses:
 *       200:
 *         description: Поездка успешно отменена
 *       400:
 *         description: Ошибка запроса
 */
router.post(
  "/:rideId/cancel",
  authMiddleware(["passenger"]),
  cancelRideHandler
);

/**
 * @swagger
 * /rides/{rideId}/onsite:
 *   post:
 *     summary: Водитель на месте
 *     tags: [Rides]
 *     parameters:
 *       - in: path
 *         name: rideId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Идентификатор поездки
 *     responses:
 *       200:
 *         description: Водитель на месте
 *       400:
 *         description: Ошибка запроса
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.post("/:rideId/onsite", authMiddleware(["driver"]), onsiteRideHandler);

/**
 * @swagger
 * /rides/{rideId}/timeout-cancel:
 *   post:
 *     summary: Отмена поездки из-за неявки пассажира
 *     tags: [Rides]
 *     parameters:
 *       - in: path
 *         name: rideId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Идентификатор поездки
 *     responses:
 *       200:
 *         description: Поездка успешно отменена
 *       400:
 *         description: Ошибка запроса
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.post(
  "/:rideId/timeout-cancel",
  authMiddleware(["driver"]),
  cancelRideIfPassengerNotArrivedHandler
);

/**
 * @swagger
 * /rides/update-status:
 *   put:
 *     summary: Обновление статуса поездки
 *     tags: [Rides]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rideId:
 *                 type: string
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Статус поездки обновлен
 *       400:
 *         description: Некорректный запрос
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.put(
  "/update-status",
  authMiddleware(["driver", "passenger"]),
  updateRideStatusHandler
);

// ==================== Управление парковкой ====================

/**
 * @swagger
 * /rides/parking/activate:
 *   post:
 *     summary: Активация режима парковки водителем
 *     tags: [Rides]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               driverId:
 *                 type: string
 *               origin:
 *                 type: object
 *                 properties:
 *                   lat:
 *                     type: number
 *                   lng:
 *                     type: number
 *     responses:
 *       200:
 *         description: Режим парковки активирован
 *       400:
 *         description: Некорректный запрос
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.post(
  "/parking/activate",
  authMiddleware(["driver"]),
  activateParkingModeHandler
);

/**
 * @swagger
 * /rides/parking/deactivate:
 *   post:
 *     summary: Деактивация режима парковки водителем
 *     tags: [Rides]
 *     responses:
 *       200:
 *         description: Режим парковки деактивирован
 *       400:
 *         description: Ошибка в запросе
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.post(
  "/parking/deactivate",
  authMiddleware(["driver"]),
  deactivateParkingModeHandler
);

/**
 * @swagger
 * /rides/parking/list:
 *   get:
 *     summary: Получение списка водителей в режиме парковки
 *     tags: [Rides]
 *     parameters:
 *       - in: query
 *         name: latitude
 *         required: true
 *         schema:
 *           type: number
 *         description: Широта текущей точки пользователя
 *       - in: query
 *         name: longitude
 *         required: true
 *         schema:
 *           type: number
 *         description: Долгота текущей точки пользователя
 *       - in: query
 *         name: radius
 *         schema:
 *           type: number
 *           default: 5
 *         description: Радиус поиска в километрах
 *     responses:
 *       200:
 *         description: Список парковочных водителей
 *       400:
 *         description: Некорректный запрос
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.get(
  "/parking/list",
  authMiddleware(["passenger"]),
  getNearbyParkedDriversHandler
);

// ==================== Управление линией ====================

/**
 * @swagger
 * /rides/line/activate:
 *   post:
 *     summary: Вход на линию водителем
 *     tags: [Rides]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               latitude:
 *                 type: number
 *                 description: Широта местоположения
 *               longitude:
 *                 type: number
 *                 description: Долгота местоположения
 *     responses:
 *       200:
 *         description: Водитель вышел на линию
 *       400:
 *         description: Ошибка в запросе
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.post("/line/activate", authMiddleware(["driver"]), activateLineHandler);

/**
 * @swagger
 * /rides/line/deactivate:
 *   post:
 *     summary: Выход с линии водителем
 *     tags: [Rides]
 *     responses:
 *       200:
 *         description: Водитель вышел с линии
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.post(
  "/line/deactivate",
  authMiddleware(["driver"]),
  deactivateLineHandler
);

// ==================== Информация о поездках ====================

/**
 * @swagger
 * /rides/cities:
 *   get:
 *     summary: Получение списка городов
 *     tags: [Rides]
 *     responses:
 *       200:
 *         description: Список городов получен
 *       500:
 *         description: Ошибка сервера
 */
router.get("/cities", getCitiesHandler);

/**
 * @swagger
 * /rides/car-classes:
 *   get:
 *     summary: Получение списка классов автомобилей
 *     tags: [Rides]
 *     responses:
 *       200:
 *         description: Список классов автомобилей получен
 *       500:
 *         description: Ошибка сервера
 */
router.get("/car-classes", getCarClassesHandler);

/**
 * @swagger
 * /rides/{rideId}:
 *   get:
 *     summary: Получение деталей поездки
 *     tags: [Rides]
 *     parameters:
 *       - in: path
 *         name: rideId
 *         required: true
 *         schema:
 *           type: string
 *         description: Идентификатор поездки
 *     responses:
 *       200:
 *         description: Данные о поездке получены
 *       400:
 *         description: Не указан rideId
 *       404:
 *         description: Данные о поездке не найдены
 *       500:
 *         description: Не удалось получить данные о поездке
 */
router.get("/:rideId", getRideDetailsHandler);

/**
 * @swagger
 * /driver/balance:
 *   get:
 *     summary: Получить текущий баланс водителя
 *     tags: [Driver]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Баланс водителя успешно получен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 driverId:
 *                   type: integer
 *                 balance:
 *                   type: number
 *       400:
 *         description: Некорректный запрос
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.get(
  "/driver/balance",
  authMiddleware(["driver"]),
  getDriverBalanceHandler
);

/**
 * @swagger
 * /rides/driver/{driverId}:
 *   get:
 *     summary: Получение данных о водителе
 *     tags: [Rides]
 *     parameters:
 *       - in: path
 *         name: driverId
 *         required: true
 *         schema:
 *           type: string
 *         description: Идентификатор водителя
 *     responses:
 *       200:
 *         description: Данные о водителе получены
 *       400:
 *         description: Не указан driverId
 *       404:
 *         description: Данные о водителе не найдены
 *       500:
 *         description: Не удалось получить данные о водителе
 */
router.get("/driver/:driverId", getDriverDetailsHandler);

/**
 * @swagger
 * /rides/driver/{driverId}/rides:
 *   get:
 *     summary: Получение списка поездок водителя
 *     tags: [Rides]
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
 *       400:
 *         description: Не указан driverId
 *       404:
 *         description: Поездки с указанным driverId не найдены
 *       500:
 *         description: Не удалось получить данные о поездках
 */
router.get(
  "/driver/:driverId/rides",
  authMiddleware(["admin"]),
  getDriverRidesHandler
);

/**
 * @swagger
 * /rides/user/{userId}/rides:
 *   get:
 *     summary: Получение списка поездок пользователя
 *     tags: [Rides]
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
 *       400:
 *         description: Не указан userId
 *       404:
 *         description: Поездки с указанным userId не найдены
 *       500:
 *         description: Не удалось получить данные о поездках
 */
router.get(
  "/user/:userId/rides",
  authMiddleware(["admin"]),
  getUserRidesHandler
);

/**
 * @swagger
 * /rides/time-range:
 *   get:
 *     summary: Получение поездок по временному промежутку
 *     tags: [Rides]
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
 *       500:
 *         description: Ошибка сервера
 */
router.get("/time-range", getRidesByTimeRange);

/**
 * @swagger
 * /rides/my-rides:
 *   get:
 *     summary: Получение всех поездок текущего пользователя
 *     tags: [Rides]
 *     responses:
 *       200:
 *         description: Список всех поездок пользователя
 *       401:
 *         description: Не авторизован
 *       500:
 *         description: Ошибка сервера
 */
router.get(
  "/my-rides",
  authMiddleware(["driver", "passenger"]),
  getAllUserRidesHandler
);

/**
 * @swagger
 * /rides/my:
 *   get:
 *     summary: Получение всех поездок текущего пользователя
 *     tags: [Rides]
 *     responses:
 *       200:
 *         description: Список всех поездок пользователя
 *       401:
 *         description: Не авторизован
 *       500:
 *         description: Ошибка сервера
 */
router.get(
  "/my",
  authMiddleware(["driver", "passenger"]),
  getAllUserRidesHandler
);

/**
 * @swagger
 * /rides/price:
 *   post:
 *     summary: Расчет расстояния и цены поездки
 *     tags: [Rides]
 *     parameters:
 *       - in: query
 *         name: origin
 *         schema:
 *           type: string
 *         required: true
 *         description: Координаты отправления в формате JSON
 *       - in: query
 *         name: destination
 *         schema:
 *           type: string
 *         required: true
 *         description: Координаты назначения в формате JSON
 *     responses:
 *       200:
 *         description: Информация о поездке получена
 *       400:
 *         description: Некорректный запрос
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.post(
  "/price",
  authMiddleware(["driver", "passenger"]),
  getRideInfoHandler
);

// ==================== Управление тарифами ====================

/**
 * @swagger
 * tags:
 *   name: Tariffs
 *   description: Управление тарифами
 */

/**
 * @swagger
 * /rides/tariffs:
 *   post:
 *     summary: Создание нового тарифа
 *     tags: [Tariffs]
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
 *               carClassId:
 *                 type: integer
 *               baseFare:
 *                 type: number
 *               costPerKm:
 *                 type: number
 *               costPerMinute:
 *                 type: number
 *     responses:
 *       201:
 *         description: Тариф успешно создан
 *       400:
 *         description: Неверные параметры запроса
 *       500:
 *         description: Ошибка сервера
 */
router.post("/tariffs", createTariffHandler);

/**
 * @swagger
 * /rides/tariffs/{cityId}:
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
router.get("/tariffs/:cityId", getTariffHandler);

/**
 * @swagger
 * /rides/tariffs/base:
 *   put:
 *     summary: Обновление базового тарифа
 *     tags: [Tariffs]
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
 *               carClassId:
 *                 type: integer
 *               baseFare:
 *                 type: number
 *               costPerKm:
 *                 type: number
 *               costPerMinute:
 *                 type: number
 *     responses:
 *       200:
 *         description: Базовый тариф обновлен
 *       404:
 *         description: Тариф не найден
 *       500:
 *         description: Ошибка сервера
 */
router.put("/tariffs/base", updateBaseTariffHandler);

/**
 * @swagger
 * /rides/tariffs/hour:
 *   put:
 *     summary: Добавление/обновление часовой корректировки
 *     tags: [Tariffs]
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
 *               carClassId:
 *                 type: integer
 *               hour:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 23
 *               percent:
 *                 type: number
 *     responses:
 *       200:
 *         description: Часовая корректировка обновлена
 *       404:
 *         description: Тариф не найден
 *       500:
 *         description: Ошибка сервера
 */
router.put(
  "/tariffs/hour",
  authMiddleware(["superadmin", "admin"]),
  updateHourAdjustmentHandler
);

/**
 * @swagger
 * /rides/tariffs/hour:
 *   delete:
 *     summary: Удаление часовой корректировки
 *     tags: [Tariffs]
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
 *             properties:
 *               cityId:
 *                 type: integer
 *               carClassId:
 *                 type: integer
 *               hour:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 23
 *     responses:
 *       200:
 *         description: Часовая корректировка удалена
 *       404:
 *         description: Тариф или корректировка не найдены
 *       500:
 *         description: Ошибка сервера
 */
router.delete("/tariffs/hour", deleteHourAdjustmentHandler);

/**
 * @swagger
 * /rides/tariffs/month:
 *   put:
 *     summary: Добавление/обновление месячной корректировки
 *     tags: [Tariffs]
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
 *               carClassId:
 *                 type: integer
 *               month:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 12
 *               percent:
 *                 type: number
 *     responses:
 *       200:
 *         description: Месячная корректировка обновлена
 *       404:
 *         description: Тариф не найден
 *       500:
 *         description: Ошибка сервера
 */
router.put(
  "/tariffs/month",
  authMiddleware(["superadmin", "admin"]),
  updateMonthAdjustmentHandler
);

/**
 * @swagger
 * /rides/tariffs/month:
 *   delete:
 *     summary: Удаление месячной корректировки
 *     tags: [Tariffs]
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
 *             properties:
 *               cityId:
 *                 type: integer
 *               carClassId:
 *                 type: integer
 *               month:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 12
 *     responses:
 *       200:
 *         description: Месячная корректировка удалена
 *       404:
 *         description: Тариф или корректировка не найдены
 *       500:
 *         description: Ошибка сервера
 */
router.delete("/tariffs/month", deleteMonthAdjustmentHandler);

/**
 * @swagger
 * /rides/tariffs/holiday:
 *   post:
 *     summary: Добавление праздничного дня
 *     tags: [Tariffs]
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
 *               carClassId:
 *                 type: integer
 *               month:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 12
 *               day:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 31
 *               percent:
 *                 type: number
 *     responses:
 *       201:
 *         description: Праздничный день добавлен
 *       400:
 *         description: Праздничный день уже существует
 *       404:
 *         description: Тариф не найден
 *       500:
 *         description: Ошибка сервера
 */
router.post("/tariffs/holiday", addHolidayHandler);

/**
 * @swagger
 * /rides/tariffs/holiday:
 *   put:
 *     summary: Обновление процента корректировки для праздника
 *     tags: [Tariffs]
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
 *               carClassId:
 *                 type: integer
 *               month:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 12
 *               day:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 31
 *               percent:
 *                 type: number
 *     responses:
 *       200:
 *         description: Праздничный день обновлен
 *       404:
 *         description: Тариф или праздник не найдены
 *       500:
 *         description: Ошибка сервера
 */
router.put("/tariffs/holiday", updateHolidayHandler);

/**
 * @swagger
 * /rides/tariffs/holiday:
 *   delete:
 *     summary: Удаление праздничного дня
 *     tags: [Tariffs]
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
 *               carClassId:
 *                 type: integer
 *               month:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 12
 *               day:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 31
 *     responses:
 *       200:
 *         description: Праздничный день удален
 *       404:
 *         description: Тариф или праздник не найдены
 *       500:
 *         description: Ошибка сервера
 */
router.delete("/tariffs/holiday", deleteHolidayHandler);

// ==================== Специальные операции ====================

/**
 * @swagger
 * /rides/without-passenger:
 *   post:
 *     summary: Создание поездки водителем без участия пассажира
 *     tags: [Rides]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               origin:
 *                 type: string
 *                 description: Координаты отправления в формате "lat,lng"
 *               destination:
 *                 type: string
 *                 description: Координаты назначения в формате "lat,lng"
 *     responses:
 *       201:
 *         description: Поездка создана
 *       400:
 *         description: Некорректный запрос
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.post(
  "/without-passenger",
  authMiddleware(["driver"]),
  createRideWithoutPassengerHandler
);

/**
 * @swagger
 * /rides/start-by-qr:
 *   post:
 *     summary: Создание поездки после сканирования QR-кода
 *     tags: [Rides]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               driverId:
 *                 type: string
 *               origin:
 *                 type: string
 *                 description: Координаты отправления в формате "lat,lng"
 *               destination:
 *                 type: string
 *                 description: Координаты назначения в формате "lat,lng"
 *     responses:
 *       201:
 *         description: Поездка создана по QR-коду
 *       400:
 *         description: Некорректный запрос
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.post(
  "/start-by-qr",
  authMiddleware(["passenger"]),
  startRideByQRHandler
);

// Дополнительные маршруты для совместимости с клиентскими приложениями
/**
 * @swagger
 * /driver/rides/my:
 *   get:
 *     summary: Получение списка всех поездок текущего водителя
 *     tags: [Rides]
 *     description: Возвращает список всех поездок, в которых участвовал текущий авторизованный водитель
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Успешное получение списка поездок
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Ride'
 *       401:
 *         description: Не авторизован или недостаточно прав (только для водителей)
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.get(
  "/driver/rides/my",
  authMiddleware(["driver"]),
  getAllUserRidesHandler
);

/**
 * @swagger
 * /user/rides/my:
 *   get:
 *     summary: Получение списка всех поездок текущего пассажира
 *     tags: [Rides]
 *     description: Возвращает список всех поездок, в которых участвовал текущий авторизованный пассажир
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Успешное получение списка поездок
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Ride'
 *       401:
 *         description: Не авторизован или недостаточно прав (только для пассажиров)
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.get(
  "/user/rides/my",
  authMiddleware(["passenger"]),
  getAllUserRidesHandler
);

/**
 * @swagger
 * /driver/balance/{driverId}:
 *   get:
 *     summary: Получить баланс водителя по ID (для административных целей)
 *     tags: [Driver]
 *     parameters:
 *       - in: path
 *         name: driverId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID водителя
 *     responses:
 *       200:
 *         description: Баланс водителя успешно получен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 driverId:
 *                   type: integer
 *                 balance:
 *                   type: number
 *       400:
 *         description: Некорректный запрос
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.get("/driver/balance/:driverId", getDriverBalanceHandler);

export default router;
