import logger from './logger.js';

export const chargeCard = async (cardToken, amount) => {
    try {

        logger.info('Списание средств с карты', { cardToken, amount });
        return true;
    } catch (error) {
        logger.error('Ошибка при списании средств', { error: error.message });
        throw error;
    }
};
