import { getReviewsByDriver } from '../services/review-query.service.js';
import logger from '../../utils/logger.js';

export const getReviewsByDriverHandler = async (req, res) => {
    try {
        const { driverId } = req.params;
        const reviews = await getReviewsByDriver(driverId);
        res.json(reviews);
    } catch (error) {
        logger.error('Failed to fetch reviews by driver', { error: error.message });
        res.status(500).json({ error: error.message });
    }
};

export const getReviewsByRideHandler = async (req, res) => {
    try {
        const { rideId } = req.params;
        const reviews = await getReviewsByRide(rideId);
        res.json(reviews);
    } catch (error) {
        logger.error('Failed to fetch reviews by driver', { error: error.message });
        res.status(500).json({ error: error.message });
    }
};
