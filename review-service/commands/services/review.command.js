import Review from '../../models/review.model.js';
import axios from 'axios';
import logger from '../../utils/logger.js';
import * as reviewSchema from "dotenv";


export const createReview = async (reviewData) => {
    const validatedData = reviewSchema.parse(reviewData);

    const rideExists = await verifyRide(validatedData.rideId, validatedData.passengerId);

    if (!rideExists) {
        throw new Error('Поездка не найдена или не принадлежит пассажиру');
    }

    const review = await Review.create(validatedData);
    logger.info('Review created successfully', { reviewId: review.id });
    return review;
};

const verifyRide = async (rideId, passengerId) => {
    try {
        const response = await axios.get(`${process.env.RIDE_SERVICE_URL}/rides/${rideId}`);
        const ride = response.data;

        return ride && ride.passengerId === passengerId;
    } catch (error) {
        logger.error('Error verifying ride', { error: error.message });
        return false;
    }
};
