import { Router } from 'express';
import { initiatePayment, topUpBalance, getBalanceHistory } from '../controllers/payment.controller.js';
import authMiddleware from "../middlewares/auth.middleware.js";


const router = Router();

router.post('/payments/initiate', authMiddleware, initiatePayment);
router.post('/balance/top-up', authMiddleware, topUpBalance);
router.get('/balance/history', authMiddleware, getBalanceHistory);

export default router;