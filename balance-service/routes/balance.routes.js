import express from 'express';
import { 
    initiatePayment,
    topUpBalance,
    deductBalance,
    getBalanceHistory,
    getBalance,
    getStatistics
} from '../controllers/balance.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = express.Router();

/**
 * @swagger
 * /api/balance/payment:
 *   post:
 *     tags:
 *       - Balance
 *     summary: Инициировать платеж за поездку
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rideId
 *               - amount
 *             properties:
 *               rideId:
 *                 type: string
 *                 format: uuid
 *                 description: ID поездки
 *               amount:
 *                 type: number
 *                 description: Сумма платежа
 *     responses:
 *       202:
 *         description: Платеж успешно инициирован
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 paymentId:
 *                   type: string
 *       500:
 *         description: Ошибка сервера
 */
router.post('/payment', authMiddleware(['passenger']), initiatePayment);

/**
 * @swagger
 * /api/balance/top-up:
 *   post:
 *     tags:
 *       - Balance
 *     summary: Пополнить баланс
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Сумма пополнения
 *     responses:
 *       200:
 *         description: Баланс успешно пополнен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 balance:
 *                   type: number
 *       500:
 *         description: Ошибка сервера
 */
router.post('/top-up', authMiddleware(['driver']), topUpBalance);

/**
 * @swagger
 * /api/balance/deduct:
 *   post:
 *     tags:
 *       - Balance
 *     summary: Списать средства с баланса
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Сумма списания
 *     responses:
 *       200:
 *         description: Средства успешно списаны
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 balance:
 *                   type: number
 *       400:
 *         description: Недостаточно средств
 *       500:
 *         description: Ошибка сервера
 */
router.post('/deduct', authMiddleware(['driver']), deductBalance);

/**
 * @swagger
 * /api/balance/history:
 *   get:
 *     tags:
 *       - Balance
 *     summary: Получить историю операций по балансу
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: История операций
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 history:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       amount:
 *                         type: number
 *                       type:
 *                         type: string
 *                         enum: [top-up, deduction]
 *                       description:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *       500:
 *         description: Ошибка сервера
 */
router.get('/history', authMiddleware(['driver']), getBalanceHistory);

/**
 * @swagger
 * /api/balance:
 *   get:
 *     tags:
 *       - Balance
 *     summary: Получить текущий баланс
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Текущий баланс
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 balance:
 *                   type: number
 *       500:
 *         description: Ошибка сервера
 */
router.get('/', authMiddleware(['driver']), getBalance);

/**
 * @swagger
 * /api/balance/statistics:
 *   get:
 *     tags:
 *       - Balance
 *     summary: Получить статистику по балансу
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Статистика баланса
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 daily:
 *                   type: number
 *                   description: Сумма за текущий день
 *                 weekly:
 *                   type: number
 *                   description: Сумма за последние 7 дней
 *                 monthly:
 *                   type: number
 *                   description: Сумма за последние 30 дней
 *       500:
 *         description: Ошибка сервера
 */
router.get('/statistics', authMiddleware(['driver']), getStatistics);

export default router; 