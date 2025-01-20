import Review from '../../models/review.model.js';
import axios from 'axios';
import logger from '../../utils/logger.js';
import * as reviewSchema from "dotenv";
import sequelize from "../../utils/database.js";
import ReviewView from "../../models/rewiew-view.model.js";


export const createReview = async (reviewData) => {
    const validatedData = reviewSchema.parse(reviewData);

    const rideExists = await verifyRide(validatedData.rideId, validatedData.passengerId);

    if (!rideExists) {
        throw new Error('Поездка не найдена или не принадлежит пассажиру');
    }

    const review = await sequelize.transaction(async (t) => {

        const newReview = await Review.create(validatedData, { transaction: t });
        logger.info('Review created successfully', { reviewId: newReview.id });

        const { driverId, rating } = newReview;

        const driverView = await ReviewView.findByPk(driverId, { transaction: t });

        if (!driverView) {
            throw new Error(`DriverView для driverId ${driverId} не существует`);
        }

        const totalRating = driverView.averageRating * driverView.reviewCount + rating;
        const newReviewCount = driverView.reviewCount + 1;
        const newAverageRating = totalRating / newReviewCount;

        await driverView.update({
            averageRating: newAverageRating,
            reviewCount: newReviewCount,
        }, { transaction: t });

        return newReview;
    });

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
