import express from 'express';
import { getReviewsByDriverHandler } from '../controllers/revew-query.controller.js';
import authMiddleware from '../../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/driver/:driverId', authMiddleware(['user', 'driver', 'admin']), getReviewsByDriverHandler);

export default router;