import ReviewView from '../../models/rewiew-view.model.js';
import logger from '../../utils/logger.js';

export const getReviewsByDriver = async (driverId) => {
    try {
        const reviews = await ReviewView.findAll({ where: { driverId } });
        logger.info('Fetched reviews by driver', { driverId });
        return reviews;
    } catch (error) {
        logger.error('Error fetching reviews by driver', { error: error.message });
        throw error;
    }
};
