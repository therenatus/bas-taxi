import logger from '../utils/logger.js';
import {
    addPaymentDetailsService,
    getPaymentDetailsService,
    deletePaymentDetailsService,
} from '../services/payment.service.js';

export const addPaymentDetails = async (req, res) => {
    logger.info('addPaymentDetails: Начало обработки запроса');
    try {
        const passengerId = req.user.userId;
        const { cardNumber, cardHolderName, expirationDate, cvc } = req.body;

        const newPaymentDetail = await addPaymentDetailsService({
            passengerId,
            cardNumber,
            cardHolderName,
            expirationDate,
            cvc,
        });

        res.status(201).json({ message: 'Реквизиты успешно добавлены', id: newPaymentDetail.id });
    } catch (error) {
        logger.error('Ошибка при добавлении реквизитов', { error: error.message });
        res.status(400).json({ error: error.message });
    }
};

export const getPaymentDetails = async (req, res) => {
    logger.info('getPaymentDetails: Начало обработки запроса');
    try {
        const passengerId = req.user.userId;

        const paymentDetails = await getPaymentDetailsService(passengerId);
        res.status(200).json(paymentDetails);
    } catch (error) {
        logger.error('Ошибка при получении реквизитов', { error: error.message });
        res.status(400).json({ error: error.message });
    }
};

export const deletePaymentDetails = async (req, res) => {
    logger.info('deletePaymentDetails: Начало обработки запроса');
    try {
        const { id } = req.params;
        const passengerId = req.user.userId;

        await deletePaymentDetailsService(id, passengerId);
        res.status(200).json({ message: 'Реквизит успешно удален' });
    } catch (error) {
        logger.error('Ошибка при удалении реквизита', { error: error.message });
        res.status(400).json({ error: error.message });
    }
};

