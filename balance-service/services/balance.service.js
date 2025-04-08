// balance/balance.service.js
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
            logger.info(`Сообщение с ID ${messageId} уже обработано`, { correlationId });
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

export const topUpBalanceService = async (userId, amount) => {
    const transaction = await sequelize.transaction();
    try {
        const [balance, created] = await DriverBalance.findOrCreate({
            where: { driverId: userId },
            defaults: { balance: amount },
            transaction,
        });

        if (!created) {
            balance.balance += amount;
            await balance.save({ transaction });
        }

        await Transaction.create({
            driverId: userId,
            amount,
            type: 'top-up',
            description: 'Пополнение баланса',
        }, { transaction });

        await transaction.commit();
        logger.info('Баланс успешно пополнен', { userId, amount });
        return balance.balance;
    } catch (error) {
        await transaction.rollback();
        logger.error('Ошибка при пополнении баланса', { error: error.message });
        throw error;
    }
};

export const deductBalanceService = async (driverId, amount) => {
    const transaction = await sequelize.transaction();
    try {
        const balanceRecord = await DriverBalance.findOne({ where: { driverId }, transaction });
        if (!balanceRecord) {
            throw new Error(`Баланс для водителя ${driverId} не найден`);
        }
        if (balanceRecord.balance < amount) {
            throw new Error('Недостаточно средств на балансе');
        }
        balanceRecord.balance -= amount;
        await balanceRecord.save({ transaction });
        await Transaction.create({
            driverId,
            amount: -amount,
            type: 'deduction',
            description: 'Списание средств при принятии поездки',
        }, { transaction });
        await transaction.commit();
        logger.info(`Списано ${amount} с баланса водителя ${driverId}. Новый баланс: ${balanceRecord.balance}`);
        return balanceRecord.balance;
    } catch (error) {
        await transaction.rollback();
        logger.error('Ошибка при списании средств с баланса', { error: error.message });
        throw error;
    }
};

export const getBalanceHistoryService = async (userId) => {
    try {
        const history = await Transaction.findAll({
            where: { driverId: userId },
            order: [['createdAt', 'DESC']]
        });
        logger.info('История баланса получена', { userId });
        return history;
    } catch (error) {
        logger.error('Ошибка при получении истории баланса', { error: error.message });
        throw error;
    }
};

export const getBalanceService = async (userId) => {
    try {
        const balanceRecord = await DriverBalance.findOne({
            where: { driverId: userId }
        });
        const balance = balanceRecord ? balanceRecord.balance : 0;
        logger.info(`Получен баланс для пользователя ${userId}: ${balance}`);
        return balance;
    } catch (error) {
        logger.error('Ошибка при получении суммы баланса', { error: error.message });
        throw error;
    }
};

export const getStatisticsService = async (driverId) => {
    try {
        const now = new Date();

        // Начало сегодняшнего дня (с полуночи)
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // Начало периода за последние 7 дней (включая сегодня)
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - 6);

        // Начало периода за последние 30 дней (включая сегодня)
        const startOfMonth = new Date(now);
        startOfMonth.setDate(now.getDate() - 29);

        const [daily, weekly, monthly] = await Promise.all([
            Transaction.sum('amount', {
                where: {
                    driverId,
                    createdAt: { [Op.gte]: startOfDay }
                }
            }),
            Transaction.sum('amount', {
                where: {
                    driverId,
                    createdAt: { [Op.gte]: startOfWeek }
                }
            }),
            Transaction.sum('amount', {
                where: {
                    driverId,
                    createdAt: { [Op.gte]: startOfMonth }
                }
            })
        ]);

        return {
            daily: daily || 0,
            weekly: weekly || 0,
            monthly: monthly || 0
        };
    } catch (error) {
        logger.error('Ошибка получения статистики дохода', { error: error.message });
        throw error;
    }
};