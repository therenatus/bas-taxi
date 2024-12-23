const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');

router.get('/get-qr-code', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'driver') {
            return res.status(403).json({ message: 'Только водители могут получать QR-код' });
        }

        const qrCodeData = req.user.userId.toString();

        res.json({ qrCodeData });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/update-status', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'driver') {
            return res.status(403).json({ message: 'Только водители могут менять статус' });
        }

        const { status } = req.body;

        if (!['offline', 'online', 'parking'].includes(status)) {
            return res.status(400).json({ message: 'Неверный статус' });
        }

        const driver = await User.findByPk(req.user.userId);
        driver.status = status;
        await driver.save();

        if (status === 'parking') {
            const { latitude, longitude } = req.body;
            channel.sendToQueue('driver_locations', Buffer.from(JSON.stringify({
                driverId: req.user.userId,
                latitude,
                longitude,
                status,
            })));
        }

        res.json({ message: 'Статус обновлен', status });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


module.exports = router;
