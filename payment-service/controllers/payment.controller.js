import { initiatePaymentSaga } from '../services/sagaOrchestrator.js';
import { topUpBalanceService, getBalanceHistoryService } from '../services/payment.service.js';
import logger from '../utils/logger.js';

export const initiatePayment = async (req, res) => {
    const { rideId, amount } = req.body;
    const passengerId = req.user.userId;

    try {
        const payment = await initiatePaymentSaga({ rideId, amount, passengerId });
        res.status(202).json({ message: 'Платеж инициирован', paymentId: payment.id });
    } catch (error) {
        logger.error('Ошибка при инициации платежа', { error: error.message });
        res.status(500).json({ error: 'Ошибка при инициации платежа' });
    }
};

export const topUpBalance = async (req, res) => {
    const { amount } = req.body;
    const userId = req.user.userId;

    try {
        const balance = await topUpBalanceService(userId, amount);
        res.json({ message: 'Баланс пополнен', balance });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getBalanceHistory = async (req, res) => {
    const userId = req.user.userId;

    try {
        const balance = await getBalanceHistoryService(userId);
        res.json({ balance });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};