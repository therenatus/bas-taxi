import { Router } from 'express';
import { initiatePayment, topUpBalance, getBalanceHistory } from '../controllers/payment.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { validateMiddleware } from '../middleware/validate.middleware.js';
import { initiatePaymentSchema } from '../validators/payment.validator.js';

const router = Router();

router.post('/payments/initiate', authMiddleware, validateMiddleware(initiatePaymentSchema), initiatePayment);
router.post('/balance/top-up', authMiddleware, topUpBalance);
router.get('/balance/history', authMiddleware, getBalanceHistory);

export default router;