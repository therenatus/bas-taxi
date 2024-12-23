import express from 'express';
import { sendSmsManually, sendVerificationCodeManually } from '../controllers/sms.controller.js';

const router = express.Router();

router.post('/send-sms', sendSmsManually);
router.post('/send-verification-code', sendVerificationCodeManually);

export default router;
