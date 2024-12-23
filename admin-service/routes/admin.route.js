import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { validateMiddleware } from '../middlewares/validate.middleware.js';
import {
    getUsers,
    approveDriver,
    getRides,
    getReviews,
    updateSettings, getDriverRequests, rejectDriver, getDriverDetails,
} from '../controllers/admin.controller.js';
import {rejectDriverSchema} from "../validators/reject-driver.js";
import {updateCostSchema} from "../validators/update-cost.validator.js";
import {authorizeRoles} from "../middlewares/role.middleware.js";
import DriverRequest from "../models/driver-request.model.js";

const router = Router();

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
 *       400:
 *         description: Ошибка валидации данных
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
// router.post(
//     '/settings',
//     authMiddleware,
//     authorizeRoles('admin', 'moderator'),
//     validateMiddleware(updateCostSchema),
//     updateSettings
// );

router.post(
    '/tariff',
    authMiddleware, authorizeRoles(['superadmin', 'admin', 'moderator']),
    validateMiddleware(updateCostSchema),
    updateSettings
);

// /**
//  * @swagger
//  * /admin/driver-requests/{requestId}/document:
//  *   get:
//  *     summary: Скачать документ заявки водителя
//  *     tags: [Admin]
//  *     security:
//  *       - bearerAuth: []
//  *     parameters:
//  *       - in: path
//  *         name: requestId
//  *         required: true
//  *         schema:
//  *           type: integer
//  *         description: Идентификатор заявки водителя
//  *     responses:
//  *       '200':
//  *         description: Файл успешно скачан
//  *         content:
//  *           application/octet-stream:
//  *             schema:
//  *               type: string
//  *               format: binary
//  *       '404':
//  *         description: Заявка водителя не найдена
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/ErrorResponse'
//  *       '500':
//  *         description: Ошибка при скачивании документа
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/ErrorResponse'
//  */
// router.get('/driver-requests/:requestId/document', authMiddleware, authorizeRoles('admin', 'moderator'), async (req, res) => {
//     const { requestId } = req.params;
//     try {
//         const driverRequest = await DriverRequest.findByPk(requestId);
//         if (!driverRequest) {
//             return res.status(404).json({ message: 'Заявка водителя не найдена' });
//         }
//
//         const filePath = driverRequest.documentPath;
//         res.download(filePath, (err) => {
//             if (err) {
//                 logger.error('Ошибка при скачивании документа водителя', { error: err.message });
//                 res.status(500).json({ error: 'Ошибка при скачивании документа' });
//             }
//         });
//     } catch (error) {
//         logger.error('Ошибка при обработке запроса на скачивание документа', { error: error.message });
//         res.status(500).json({ error: 'Ошибка при скачивании документа' });
//     }
// });

export default router;
