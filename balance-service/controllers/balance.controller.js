// controller/balance.controller.js
import { initiatePaymentSaga } from '../services/sagaOrchestrator.js';
import { 
    topUpBalanceService, 
    getBalanceHistoryService, 
    getBalanceService,
    getStatisticsService,
    deductBalanceService
} from '../services/balance.service.js';
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

export const deductBalance = async (req, res) => {
    const { amount } = req.body;
    const userId = req.user.userId;

    try {
        const balance = await deductBalanceService(userId, amount);
        res.json({ message: 'Средства списаны', balance });
    } catch (error) {
        if (error.message === 'Недостаточно средств на балансе') {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
};

export const getBalanceHistory = async (req, res) => {
    const userId = req.user.userId;

    try {
        const history = await getBalanceHistoryService(userId);
        res.json({ history });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getBalance = async (req, res) => {
    const userId = req.user.userId;

    try {
        const balance = await getBalanceService(userId);
        res.json({ balance });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getStatistics = async (req, res) => {
    const userId = req.user.userId;

    try {
        const statistics = await getStatisticsService(userId);
        res.json(statistics);
    } catch (error) {
        res.status(500).json({ error: 'Ошибка получения статистики дохода' });
    }
};