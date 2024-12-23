import DriverBalance from '../models/balance.model.js';
import Transaction from '../models/transaction.model.js';
import Tariff from '../models/tariff.model.js';
import ProcessedMessage from '../models/processed-message.model.js';
import sequelize from '../utils/database.js';
import logger from '../utils/logger.js';

export const updateDriverBalance = async (rideData, correlationId) => {
    const transaction = await sequelize.transaction();
    const messageId = rideData.messageId;

    try {
        const alreadyProcessed = await ProcessedMessage.findOne({
            where: { messageId },
        });
        if (alreadyProcessed) {
            logger.info(`Сообщение с ID ${messageId} уже обработано`, {
                correlationId,
            });
            await transaction.rollback();
            return;
        }

        const { driverId, city, price } = rideData;

        const tariff = await Tariff.findByPk(city);
        if (!tariff) {
            throw new Error(`Тариф для города ${city} не найден`);
        }

        const commission = (price * tariff.commissionPercentage) / 100;
        const amountToDriver = price - commission;

        const [balance, created] = await DriverBalance.findOrCreate({
            where: { driverId },
            defaults: { balance: amountToDriver },
            transaction,
        });

        if (!created) {
            balance.balance += amountToDriver;
            await balance.save({ transaction });
        }

        await Transaction.create({
            driverId,
            amount: amountToDriver,
            type: 'top-up',
            description: `Оплата поездки, удержана комиссия ${commission}`,
        }, { transaction });

        await ProcessedMessage.create({
            messageId,
            processedAt: new Date(),
        }, { transaction });

        await transaction.commit();
        logger.info(`Баланс водителя ${driverId} обновлен`, { correlationId });
    } catch (error) {
        await transaction.rollback();
        logger.error('Ошибка при обновлении баланса водителя', {
            error: error.message,
            correlationId,
        });
        throw error;
    }
};
