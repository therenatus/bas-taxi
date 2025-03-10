import ReviewView from '../../models/rewiew-view.model.js';
import logger from '../../utils/logger.js';
import ReviewModel from "../../models/review.model.js";

export const getReviewsByDriver = async (driverId) => {
    try {
        const reviews = await ReviewView.findByPk(driverId);
        logger.info('Fetched reviews by driver', { driverId });
        return reviews;
    } catch (error) {
        logger.error('Error fetching reviews by driver', { error: error.message });
        throw error;
    }
};

export const getReviewsByRide = async (rideId) => {
    try {
        const reviews = await ReviewModel.findOne({ where: { rideId }});
        logger.info('Fetched review by ride', { rideId });
        return reviews;
    } catch (error) {
        logger.error('Error fetching review by ride', { error: error.message });
        throw error;
    }
};

