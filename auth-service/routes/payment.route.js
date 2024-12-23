  import express from 'express';
import { addPaymentDetails, getPaymentDetails, deletePaymentDetails } from '../controllers/payment.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: PaymentDetails
 *   description: Управление реквизитами пассажиров
 */

/**
 * @swagger
 * /payment-details:
 *   post:
 *     summary: Добавление реквизитов оплаты
 *     tags: [PaymentDetails]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - cardNumber
 *               - cardHolderName
 *               - expirationDate
 *               - cvc
 *             properties:
 *               cardNumber:
 *                 type: string
 *               cardHolderName:
 *                 type: string
 *               expirationDate:
 *                 type: string
 *                 example: "12/25"
 *               cvc:
 *                 type: string
 *     responses:
 *       201:
 *         description: Реквизиты успешно добавлены
 */
router.post('/', authMiddleware, addPaymentDetails);

/**
 * @swagger
 * /payment-details:
 *   get:
 *     summary: Получение всех реквизитов пассажира
 *     tags: [PaymentDetails]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список реквизитов
 */
router.get('/', authMiddleware, getPaymentDetails);

/**
 * @swagger
 * /payment-details/{id}:
 *   delete:
 *     summary: Удаление реквизита текущего пользователя
 *     tags: [PaymentDetails]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Реквизит успешно удален
 *       400:
 *         description: Ошибка валидации
 *       401:
 *         description: Токен не предоставлен или неверен
 */
router.delete('/:id', authMiddleware, deletePaymentDetails);

export default router;
