import PaymentDetails from '../models/payment.model.js';
import logger from '../utils/logger.js';

export const addPaymentDetailsService = async ({ passengerId, cardNumber, cardHolderName, expirationDate, cvc }) => {
    logger.info('addPaymentDetailsService: Начало добавления реквизитов');

    const newPaymentDetail = await PaymentDetails.create({
        passengerId,
        cardNumber,
        cardHolderName,
        expirationDate,
        cvc,
    });

    logger.info('addPaymentDetailsService: Реквизиты успешно добавлены', { passengerId });
    return newPaymentDetail;
};

export const getPaymentDetailsService = async (passengerId) => {
    logger.info('getPaymentDetailsService: Получение реквизитов для пассажира', { passengerId });

    const paymentDetails = await PaymentDetails.findAll({ where: { passengerId } });
    logger.info('getPaymentDetailsService: Реквизиты успешно получены', { passengerId });

    return paymentDetails;
};

export const deletePaymentDetailsService = async (id, passengerId) => {
    logger.info('deletePaymentDetailsService: Удаление реквизита', { id, passengerId });

    const paymentDetail = await PaymentDetails.findOne({ where: { id, passengerId } });
    if (!paymentDetail) {
        logger.warn('deletePaymentDetailsService: Реквизит не найден или не принадлежит пользователю', { id, passengerId });
        throw new Error('Вы не можете удалить этот реквизит');
    }

    await paymentDetail.destroy();
    logger.info('deletePaymentDetailsService: Реквизит успешно удален', { id, passengerId });

    return paymentDetail;
};

