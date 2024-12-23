import express from 'express';
import { createReviewHandler } from '../controllers/review.controller.js';
import authMiddleware from '../../middlewares/auth.middleware.js';

const router = express.Router();

router.post('/', authMiddleware(['user']), createReviewHandler);

export default router;
