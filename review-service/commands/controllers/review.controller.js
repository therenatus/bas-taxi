import { createReview } from '../services/review.command.js';
import logger from '../../utils/logger.js';

export const createReviewHandler = async (req, res) => {
    try {
        const reviewData = req.body;
        reviewData.passengerId = req.user.userId;

        const review = await createReview(reviewData);
        res.status(201).json({ message: 'Отзыв успешно создан', review });
    } catch (error) {
        logger.error('Failed to create review', { error: error.message });
        res.status(400).json({ error: error.message });
    }
};
