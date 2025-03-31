import express from 'express';
import { getReviewsByDriverHandler, getReviewsByRideHandler } from '../controllers/revew-query.controller.js';
import authMiddleware from '../../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/driver/:driverId', getReviewsByDriverHandler);
router.get('/ride/:rideId', getReviewsByRideHandler);


export default router;
