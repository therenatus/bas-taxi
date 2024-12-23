import Driver from '../models/driver.model.js';
import logger from '../utils/logger.js';

export const updateDriverParkingMode = async (driverId, isParkingMode, correlationId) => {
    try {
        const driver = await Driver.findByPk(driverId);
        if (!driver) {
            throw new Error(`Водитель с ID ${driverId} не найден`);
        }

        driver.isParkingMode = isParkingMode;
        await driver.save();

        logger.info('Состояние парковки водителя обновлено', { driverId, isParkingMode, correlationId });
    } catch (error) {
        logger.error('Ошибка при обновлении состояния парковки водителя', { error: error.message, correlationId });
        throw error;
    }
};
