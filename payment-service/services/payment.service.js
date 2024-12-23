import Balance, {Payment} from '../models/payment.model.js';
import axios from "axios";
import logger from "../utils/logger.js";
import {chargeCard} from "../utils/payment.gateway.js";
import Tariff from "../models/tariff.model.js";

export const topUpBalanceService = async (userId, amount, role) => {
    if (role !== 'driver') {
        throw new Error('Только водители могут пополнять баланс');
    }

    let balance = await Balance.findOne({ where: { driverId: userId } });
    if (!balance) {
        balance = await Balance.create({ driverId: userId, amount: 0 });
    }

    balance.amount += parseFloat(amount);
    await balance.save();
    return balance;
};

export const deductFromBalance = async (userId, amount) => {
    try {
        const balance = await Balance.findOne({ where: { userId } });
        if (!balance) {
            throw new Error('Баланс пользователя не найден');
        }

        if (balance.amount < amount) {
            throw new Error('Недостаточно средств на балансе');
        }

        balance.amount -= amount;
        await balance.save();

        logger.info('Списание средств успешно', { userId, amount, newBalance: balance.amount });
        return balance;
    } catch (error) {
        logger.error('Ошибка при списании средств с баланса', { error: error.message });
        throw error;
    }
};

export const getBalanceHistoryService = async (userId, role) => {
    if (role !== 'driver') {
        throw new Error('Нет доступа');
    }

    const balance = await Balance.findOne({ where: { driverId: userId } });
    return balance;
};


export const processPayment = async ({ rideId, passengerId, driverId, amount, city, paymentMethod }) => {
    try {
        if (paymentMethod === 'card') {
            const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://auth-service/api/payment-methods';
            const response = await axios.get(`${authServiceUrl}/${passengerId}`);

            if (response.status !== 200) {
                throw new Error(`Не удалось получить метод оплаты: статус ${response.status}`);
            }

            const paymentMethodData = response.data;

            if (!paymentMethodData || !paymentMethodData.cardToken) {
                throw new Error('Метод оплаты не найден или некорректен');
            }

            await chargeCard(paymentMethodData.cardToken, amount);
            logger.info('Списание средств с карты пассажира успешно', { rideId, passengerId, amount });
        }

        const tariff = await Tariff.findOne({ where: { city } });
        if (!tariff) {
            throw new Error(`Тариф для города ${city} не найден`);
        }

        let commission = 0;
        let amountToDriver = amount;

        if (paymentMethod === 'card') {
            commission = (tariff.commissionPercentage / 100) * amount;
            amountToDriver = amount - commission;
            logger.info(`Вычислена комиссия: ${commission} для города ${city}`);
        }

        const driverBalance = await Balance.findOne({ where: { userId: driverId } });
        if (!driverBalance) {
            throw new Error('Баланс водителя не найден');
        }

        driverBalance.amount += amountToDriver;
        await driverBalance.save();

        logger.info(`На баланс водителя ${driverId} начислено ${amountToDriver}. Новый баланс: ${driverBalance.amount}`);

        await Payment.update({ status: 'completed' }, { where: { rideId } });

        logger.info('Платеж успешно обработан', { rideId, passengerId, driverId, amount, commission, amountToDriver });
    } catch (error) {
        await Payment.update({ status: 'failed' }, { where: { rideId } });

        logger.error('Ошибка при обработке платежа', { rideId, error: error.message });
        throw error;
    }
};
