import { getChannel } from '../utils/rabbitmq.js';
import logger from '../utils/logger.js';
import redis from '../utils/redis.js';
import Tariff from '../models/tarrif.model.js';
import City from '../models/city.model.js';

const getRedisKey = (cityId, carClassId) => `tariff:${cityId}:${carClassId}`;

// Получает процент изменения costPerKm для текущего часа
const getHourAdjustmentPercent = (hour, hourlyAdjustments) => {
    const hourKey = hour.toString();
    return hourlyAdjustments[hourKey] || 0; // Если нет корректировки для часа, возвращаем 0%
};

// Получает процент изменения costPerKm для текущего месяца
const getMonthAdjustmentPercent = (month, monthlyAdjustments) => {
    const monthKey = month.toString();
    return monthlyAdjustments[monthKey] || 0; // Если нет корректировки для месяца, возвращаем 0%
};

// Проверяет, является ли текущая дата праздником и возвращает процент корректировки
const getHolidayAdjustmentPercent = (date, holidayAdjustments) => {
    const month = date.getMonth() + 1; // JavaScript months are 0-based
    const day = date.getDate();

    const holiday = holidayAdjustments.find(h => h.month === month && h.day === day);
    return holiday ? holiday.percent : 0;
};

export const getTariff = async (cityId, carClassId) => {
    const redisKey = getRedisKey(cityId, carClassId);

    let tariff = await redis.get(redisKey);
    if (tariff) {
        logger.info('Тариф загружен из Redis', { cityId, carClassId });
        return JSON.parse(tariff);
    }

    tariff = await Tariff.findOne({ 
        where: { 
            cityId, 
            carClassId,
            isActive: true 
        } 
    });

    if (!tariff) {
        logger.warn('Тариф не найден', { cityId, carClassId });
        throw new Error('Тариф не найден');
    }

    await redis.set(redisKey, JSON.stringify(tariff), { EX: 3600 });
    logger.info('Тариф загружен из БД и закеширован', { cityId, carClassId });

    return tariff;
};

export const getCityTariff = async (city) => {
    try {
        let tariff = await redis.get(`tariff:${city}`);
        tariff = tariff ? JSON.parse(tariff) : null;
        console.log('tarrif from redis:', tariff)
        if (tariff) {
            logger.info('tariff.service: тариф загружен из Redis', { city });
            return tariff;
        }

        if (!tariff) {
            tariff = await getTariffFromDB(city);
            console.log('tarrif from db:', tariff)
            await redis.set(`tariff:${city}`, JSON.stringify(tariff), {
                EX: 3600,
            });
            logger.info('tariff.service: тариф загружен из БД и кеширован', { city });
            return tariff;
        } else {
            logger.warn('tariff.service: тариф для города не найден или город не поддерживается', { city });
            throw new Error(`Тариф для города "${city}" не найден или город не поддерживается`);
        }

    } catch (error) {
        logger.warn('tariff.service: ошибка при получении тарифа для города', { city, error: error.message });
        throw error;
    }
};

const getTariffFromDB = async (city) => {
    try {
        // Сначала находим город по названию
        const cityRecord = await City.findOne({ where: { name: city } });
        
        if (!cityRecord) {
            logger.warn('tariff.service: город не найден в базе данных', { city });
            return null;
        }
        
        // Используем cityId для поиска тарифа
        const tariffRecord = await Tariff.findOne({ 
            where: { 
                cityId: cityRecord.id,
                carClassId: 1, // Используем базовый класс автомобиля по умолчанию
                isActive: true 
            } 
        });
        
        if (tariffRecord) {
            return {
                baseFare: tariffRecord.baseFare,
                costPerKm: tariffRecord.costPerKm,
                costPerMinute: tariffRecord.costPerMinute,
                monthlyAdjustments: tariffRecord.monthlyAdjustments,
                hourlyAdjustments: tariffRecord.hourlyAdjustments,
                holidayAdjustments: tariffRecord.holidayAdjustments,
                serviceFeePercent: tariffRecord.serviceFeePercent
            };
        }
        
        return null;
    } catch (error) {
        logger.error('tariff.service: ошибка при обращении к базе данных', { city, error: error.message });
        throw new Error('Ошибка при обращении к базе данных');
    }
};

export const updateTariff = async (cityId, carClassId, newTariffData, adminId, reason) => {
    const transaction = await Tariff.sequelize.transaction();

    try {
        const tariff = await Tariff.findOne({ 
            where: { 
                cityId, 
                carClassId,
                isActive: true 
            }, 
            transaction 
        });

        if (!tariff) throw new Error('Тариф не найден');

        await tariff.update({
            ...newTariffData,
            updatedBy: adminId
        }, { transaction });

        const redisKey = getRedisKey(cityId, carClassId);
        await redis.del(redisKey);

        // Создаем запись в истории с указанием админа и причины
        const { TariffHistory } = await import('./tariff-history.model.js');
        await TariffHistory.create({
            tariffId: tariff.id,
            cityId,
            carClassId,
            oldValues: JSON.stringify(tariff._previousDataValues),
            newValues: JSON.stringify(tariff.dataValues),
            changedBy: adminId,
            changeReason: reason
        }, { transaction });

        await transaction.commit();

        logger.info('Тариф обновлён и кеш удалён', { 
            cityId, 
            carClassId,
            adminId,
            reason 
        });
    } catch (error) {
        await transaction.rollback();
        logger.error('Ошибка при обновлении тарифа', { 
            cityId, 
            carClassId,
            error: error.message 
        });
        throw error;
    }
};

export const addTariff = async (tariffData, adminId) => {
    const transaction = await Tariff.sequelize.transaction();
    try {
        const { cityId, carClassId } = tariffData;

        // Проверяем, нет ли уже активного тарифа
        const existingTariff = await Tariff.findOne({
            where: {
                cityId,
                carClassId,
                isActive: true
            }
        });

        if (existingTariff) {
            throw new Error('Активный тариф для этих параметров уже существует');
        }

        const tariff = await Tariff.create({
            ...tariffData,
            createdBy: adminId
        }, { transaction });

        const redisKey = getRedisKey(cityId, carClassId);
        await redis.set(redisKey, JSON.stringify(tariff), { EX: 3600 });

        logger.info('Новый тариф добавлен и кеширован', {
            cityId,
            carClassId,
            adminId
        });

        await transaction.commit();
        return tariff;
    } catch (error) {
        await transaction.rollback();
        logger.error('Ошибка при добавлении тарифа', {
            error: error.message,
            tariffData
        });
        throw error;
    }
};

export const updateTariffForCity = async (tariffData) => {
    const { cityId, carClassId } = tariffData;
    try {
        const tariff = await Tariff.findOne({
            where: {
                cityId,
                carClassId,
                isActive: true
            }
        });

        if (tariff) {
            await tariff.update(tariffData);
        } else {
            await Tariff.create(tariffData);
        }

        const redisKey = getRedisKey(cityId, carClassId);
        await redis.del(redisKey);

        logger.info('tariff.service: тариф обновлен', { 
            cityId, 
            carClassId
        });
    } catch (error) {
        logger.error('tariff.service: ошибка при обновлении тарифа', { 
            error: error.message,
            tariffData 
        });
        throw new Error('Не удалось обновить тариф');
    }
};

export const updateTariffsFromMessage = async (newTariffs, correlationId) => {
    try {
        for (const [cityId, cityTariffs] of Object.entries(newTariffs)) {
            for (const [carClassId, tariffData] of Object.entries(cityTariffs)) {
                await updateTariffForCity({
                    cityId: parseInt(cityId),
                    carClassId: parseInt(carClassId),
                    ...tariffData
                });
            }
        }

        logger.info('tariff.service: тарифы обновлены через RabbitMQ', { 
            correlationId,
            citiesCount: Object.keys(newTariffs).length
        });
    } catch (error) {
        logger.error('tariff.service: ошибка при массовом обновлении тарифов', { 
            error: error.message, 
            correlationId 
        });
        throw new Error('Не удалось обновить тарифы');
    }
};

export const validateCitySupported = async (city) => {
    try {
        const tariff = await getCityTariff(city);
        logger.info('tariff.service: город поддерживается', { city });
        return !!tariff;
    } catch (error) {
        logger.warn('tariff.service: город не поддерживается', { city, error: error.message });
        return false;
    }
};

export const calculatePrice = async ({ cityId, carClassId, distance, duration }) => {
    const now = new Date();
    const hour = now.getHours();
    const month = now.getMonth() + 1; // JavaScript months are 0-based
    const tariff = await getTariff(cityId, carClassId);

    // Определяем применяемые проценты изменения для costPerKm
    const holidayPercent = getHolidayAdjustmentPercent(now, tariff.holidayAdjustments);
    const hourPercent = getHourAdjustmentPercent(hour, tariff.hourlyAdjustments);
    const monthPercent = getMonthAdjustmentPercent(month, tariff.monthlyAdjustments);
    
    // Приоритеты: 1) Праздник, 2) Час пик / непиковый час, 3) Месяц
    // Берем только одну корректировку с наивысшим приоритетом
    let appliedPercent = 0;
    let appliedType = 'none';
    
    if (holidayPercent !== 0) {
        appliedPercent = holidayPercent;
        appliedType = 'holiday';
    } else if (hourPercent !== 0) {
        appliedPercent = hourPercent;
        appliedType = 'hour';
    } else if (monthPercent !== 0) {
        appliedPercent = monthPercent;
        appliedType = 'month';
    }
    
    // Вычисляем скорректированную стоимость за километр
    const adjustedCostPerKm = tariff.costPerKm * (1 + (appliedPercent / 100));

    const { 
        baseFare, 
        costPerMinute, 
        serviceFeePercent = 0
    } = tariff;

    // Применяем корректировку только к стоимости за километр, базовая стоимость не меняется
    const price = baseFare + (adjustedCostPerKm * distance) + (costPerMinute * duration);
    const serviceFee = (price * serviceFeePercent) / 100;

    logger.info('Стоимость поездки рассчитана', { 
        cityId, 
        carClassId, 
        distance, 
        duration, 
        price, 
        serviceFee,
        baseFare,
        originalCostPerKm: tariff.costPerKm,
        adjustedCostPerKm,
        appliedPercent,
        appliedType,
        hour,
        month,
        holidayPercent,
        hourPercent,
        monthPercent
    });

    return {
        price: price.toFixed(2),
        serviceFee: serviceFee.toFixed(2),
        totalAmount: (price - serviceFee).toFixed(2),
        appliedTariff: {
            baseFare,
            originalCostPerKm: tariff.costPerKm,
            adjustedCostPerKm,
            costPerMinute,
            appliedPercent,
            appliedType,
            description: tariff.description
        }
    };
};

export const calculatePriceForCity = async (city, distance, duration) => {
    try {
        const now = new Date();
        const hour = now.getHours();
        const month = now.getMonth() + 1; // JavaScript months are 0-based
        const tariff = await getCityTariff(city);

        if (!tariff) {
            throw new Error(`Тариф для города "${city}" не найден`);
        }

        // Определяем применяемые проценты изменения для costPerKm
        const holidayPercent = getHolidayAdjustmentPercent(now, tariff.holidayAdjustments || []);
        const hourPercent = getHourAdjustmentPercent(hour, tariff.hourlyAdjustments || {});
        const monthPercent = getMonthAdjustmentPercent(month, tariff.monthlyAdjustments || {});
        
        // Приоритеты: 1) Праздник, 2) Час пик / непиковый час, 3) Месяц
        let appliedPercent = 0;
        let appliedType = 'none';
        
        if (holidayPercent !== 0) {
            appliedPercent = holidayPercent;
            appliedType = 'holiday';
        } else if (hourPercent !== 0) {
            appliedPercent = hourPercent;
            appliedType = 'hour';
        } else if (monthPercent !== 0) {
            appliedPercent = monthPercent;
            appliedType = 'month';
        }
        
        // Вычисляем скорректированную стоимость за километр
        const adjustedCostPerKm = tariff.costPerKm * (1 + (appliedPercent / 100));

        // Применяем корректировку только к стоимости за километр, базовая стоимость не меняется
        const price = tariff.baseFare + (adjustedCostPerKm * distance) + (tariff.costPerMinute * duration);

        logger.info('tariff.service: стоимость поездки рассчитана', { 
            city, 
            distance, 
            duration, 
            price,
            baseFare: tariff.baseFare,
            originalCostPerKm: tariff.costPerKm,
            adjustedCostPerKm,
            appliedPercent,
            appliedType,
            hour,
            month
        });
        
        return price.toFixed(2);
    } catch (error) {
        logger.error('tariff.service: ошибка при расчете стоимости поездки', { city, error: error.message });
        throw new Error('Не удалось рассчитать стоимость поездки');
    }
};

export const subscribeToTariffUpdates = async () => {
    const channel = await getChannel();
    const exchangeName = 'settings_events';

    await channel.assertExchange(exchangeName, 'fanout', { durable: true });
    const q = await channel.assertQueue('', { exclusive: true });
    await channel.bindQueue(q.queue, exchangeName, '');

    channel.consume(q.queue, async (msg) => {
        try {
            if (!msg.content) {
                logger.warn('tariff.service: пустое сообщение RabbitMQ');
                return;
            }

            const message = JSON.parse(msg.content.toString());
            const correlationId = msg.properties.headers['x-correlation-id'];

            if (message.event === 'settings_updated' && message.data) {
                await updateTariffsFromMessage(message.data, correlationId);
                logger.info('tariff.service: тарифы обновлены через RabbitMQ', { correlationId });
            } else {
                logger.warn('tariff.service: неизвестное событие или отсутствуют данные', { message });
            }
        } catch (error) {
            logger.error('tariff.service: ошибка при обработке сообщения RabbitMQ', { error: error.message });
        }
    }, { noAck: true });
};

// Получение всех тарифов для города и класса автомобиля
export const getTariffs = async (cityId, carClassId) => {
    try {
        const tariffs = await Tariff.findAll({
            where: {
                cityId,
                carClassId,
                isActive: true
            },
            order: [
                ['month', 'ASC'],
                ['hour', 'ASC']
            ]
        });

        return tariffs.map(tariff => ({
            ...tariff.dataValues,
            effectivePrice: tariff.baseFare * tariff.seasonalMultiplier
        }));
    } catch (error) {
        logger.error('Ошибка при получении тарифов', {
            cityId,
            carClassId,
            error: error.message
        });
        throw error;
    }
};

// Добавление/изменение месячной корректировки
export const updateMonthAdjustment = async (cityId, carClassId, month, percent, adminId, reason) => {
    const transaction = await Tariff.sequelize.transaction();
    try {
        const tariff = await Tariff.findOne({
            where: {
                cityId,
                carClassId,
                isActive: true
            },
            transaction
        });

        if (!tariff) {
            throw new Error('Тариф не найден');
        }

        // Клонируем текущие месячные корректировки
        const monthlyAdjustments = { ...tariff.monthlyAdjustments };
        
        // Добавляем или обновляем корректировку для указанного месяца
        monthlyAdjustments[month.toString()] = percent;

        await tariff.update({
            monthlyAdjustments
        }, { transaction });

        // Инвалидируем кеш
        const redisKey = getRedisKey(cityId, carClassId);
        await redis.del(redisKey);

        // Создаем запись в истории
        const { TariffHistory } = await import('./tariff-history.model.js');
        await TariffHistory.create({
            tariffId: tariff.id,
            cityId,
            carClassId,
            oldValues: JSON.stringify(tariff._previousDataValues),
            newValues: JSON.stringify(tariff.dataValues),
            changedBy: adminId,
            changeReason: reason || `Изменена месячная корректировка для месяца ${month}: ${percent}%`
        }, { transaction });

        await transaction.commit();

        logger.info('Месячная корректировка обновлена', {
            cityId,
            carClassId,
            month,
            percent,
            adminId
        });

        return tariff;
    } catch (error) {
        await transaction.rollback();
        logger.error('Ошибка при обновлении месячной корректировки', {
            error: error.message,
            cityId,
            carClassId,
            month,
            percent
        });
        throw error;
    }
};

// Удаление месячной корректировки
export const deleteMonthAdjustment = async (cityId, carClassId, month, adminId, reason) => {
    const transaction = await Tariff.sequelize.transaction();
    try {
        const tariff = await Tariff.findOne({
            where: {
                cityId,
                carClassId,
                isActive: true
            },
            transaction
        });

        if (!tariff) {
            throw new Error('Тариф не найден');
        }

        // Клонируем текущие месячные корректировки
        const monthlyAdjustments = { ...tariff.monthlyAdjustments };
        
        // Удаляем корректировку для указанного месяца, если она существует
        if (monthlyAdjustments[month.toString()] !== undefined) {
            delete monthlyAdjustments[month.toString()];
        } else {
            throw new Error(`Корректировка для месяца ${month} не найдена`);
        }

        await tariff.update({
            monthlyAdjustments
        }, { transaction });

        // Инвалидируем кеш
        const redisKey = getRedisKey(cityId, carClassId);
        await redis.del(redisKey);

        // Создаем запись в истории
        const { TariffHistory } = await import('./tariff-history.model.js');
        await TariffHistory.create({
            tariffId: tariff.id,
            cityId,
            carClassId,
            oldValues: JSON.stringify(tariff._previousDataValues),
            newValues: JSON.stringify(tariff.dataValues),
            changedBy: adminId,
            changeReason: reason || `Удалена месячная корректировка для месяца ${month}`
        }, { transaction });

        await transaction.commit();

        logger.info('Месячная корректировка удалена', {
            cityId,
            carClassId,
            month,
            adminId
        });

        return tariff;
    } catch (error) {
        await transaction.rollback();
        logger.error('Ошибка при удалении месячной корректировки', {
            error: error.message,
            cityId,
            carClassId,
            month
        });
        throw error;
    }
};

// Добавление/изменение часовой корректировки
export const updateHourAdjustment = async (cityId, carClassId, hour, percent, adminId, reason) => {
    const transaction = await Tariff.sequelize.transaction();
    try {
        const tariff = await Tariff.findOne({
            where: {
                cityId,
                carClassId,
                isActive: true
            },
            transaction
        });

        if (!tariff) {
            throw new Error('Тариф не найден');
        }

        // Клонируем текущие часовые корректировки
        const hourlyAdjustments = { ...tariff.hourlyAdjustments };
        
        // Добавляем или обновляем корректировку для указанного часа
        hourlyAdjustments[hour.toString()] = percent;

        await tariff.update({
            hourlyAdjustments
        }, { transaction });

        // Инвалидируем кеш
        const redisKey = getRedisKey(cityId, carClassId);
        await redis.del(redisKey);

        // Создаем запись в истории
        const { TariffHistory } = await import('./tariff-history.model.js');
        await TariffHistory.create({
            tariffId: tariff.id,
            cityId,
            carClassId,
            oldValues: JSON.stringify(tariff._previousDataValues),
            newValues: JSON.stringify(tariff.dataValues),
            changedBy: adminId,
            changeReason: reason || `Изменена часовая корректировка для часа ${hour}: ${percent}%`
        }, { transaction });

        await transaction.commit();

        logger.info('Часовая корректировка обновлена', {
            cityId,
            carClassId,
            hour,
            percent,
            adminId
        });

        return tariff;
    } catch (error) {
        await transaction.rollback();
        logger.error('Ошибка при обновлении часовой корректировки', {
            error: error.message,
            cityId,
            carClassId,
            hour,
            percent
        });
        throw error;
    }
};

// Удаление часовой корректировки
export const deleteHourAdjustment = async (cityId, carClassId, hour, adminId, reason) => {
    const transaction = await Tariff.sequelize.transaction();
    try {
        const tariff = await Tariff.findOne({
            where: {
                cityId,
                carClassId,
                isActive: true
            },
            transaction
        });

        if (!tariff) {
            throw new Error('Тариф не найден');
        }

        // Клонируем текущие часовые корректировки
        const hourlyAdjustments = { ...tariff.hourlyAdjustments };
        
        // Удаляем корректировку для указанного часа, если она существует
        if (hourlyAdjustments[hour.toString()] !== undefined) {
            delete hourlyAdjustments[hour.toString()];
        } else {
            throw new Error(`Корректировка для часа ${hour} не найдена`);
        }

        await tariff.update({
            hourlyAdjustments
        }, { transaction });

        // Инвалидируем кеш
        const redisKey = getRedisKey(cityId, carClassId);
        await redis.del(redisKey);

        // Создаем запись в истории
        const { TariffHistory } = await import('./tariff-history.model.js');
        await TariffHistory.create({
            tariffId: tariff.id,
            cityId,
            carClassId,
            oldValues: JSON.stringify(tariff._previousDataValues),
            newValues: JSON.stringify(tariff.dataValues),
            changedBy: adminId,
            changeReason: reason || `Удалена часовая корректировка для часа ${hour}`
        }, { transaction });

        await transaction.commit();

        logger.info('Часовая корректировка удалена', {
            cityId,
            carClassId,
            hour,
            adminId
        });

        return tariff;
    } catch (error) {
        await transaction.rollback();
        logger.error('Ошибка при удалении часовой корректировки', {
            error: error.message,
            cityId,
            carClassId,
            hour
        });
        throw error;
    }
};

// Добавление праздничного дня
export const addHoliday = async (cityId, carClassId, month, day, percent, adminId, reason) => {
    const transaction = await Tariff.sequelize.transaction();
    try {
        const tariff = await Tariff.findOne({
            where: {
                cityId,
                carClassId,
                isActive: true
            },
            transaction
        });

        if (!tariff) {
            throw new Error('Тариф не найден');
        }

        // Клонируем текущие праздничные дни
        const holidayAdjustments = [...tariff.holidayAdjustments];
        
        // Проверяем, существует ли уже этот праздник
        const existingHolidayIndex = holidayAdjustments.findIndex(
            h => h.month === month && h.day === day
        );

        if (existingHolidayIndex >= 0) {
            throw new Error(`Праздничный день ${day}.${month} уже существует`);
        }

        // Добавляем новый праздник
        holidayAdjustments.push({ month, day, percent });

        await tariff.update({
            holidayAdjustments
        }, { transaction });

        // Инвалидируем кеш
        const redisKey = getRedisKey(cityId, carClassId);
        await redis.del(redisKey);

        // Создаем запись в истории
        const { TariffHistory } = await import('./tariff-history.model.js');
        await TariffHistory.create({
            tariffId: tariff.id,
            cityId,
            carClassId,
            oldValues: JSON.stringify(tariff._previousDataValues),
            newValues: JSON.stringify(tariff.dataValues),
            changedBy: adminId,
            changeReason: reason || `Добавлен праздничный день ${day}.${month} с корректировкой ${percent}%`
        }, { transaction });

        await transaction.commit();

        logger.info('Праздничный день добавлен', {
            cityId,
            carClassId,
            month,
            day,
            percent,
            adminId
        });

        return tariff;
    } catch (error) {
        await transaction.rollback();
        logger.error('Ошибка при добавлении праздничного дня', {
            error: error.message,
            cityId,
            carClassId,
            month,
            day,
            percent
        });
        throw error;
    }
};

// Обновление существующего праздничного дня
export const updateHoliday = async (cityId, carClassId, month, day, percent, adminId, reason) => {
    const transaction = await Tariff.sequelize.transaction();
    try {
        const tariff = await Tariff.findOne({
            where: {
                cityId,
                carClassId,
                isActive: true
            },
            transaction
        });

        if (!tariff) {
            throw new Error('Тариф не найден');
        }

        // Клонируем текущие праздничные дни
        const holidayAdjustments = [...tariff.holidayAdjustments];
        
        // Находим праздник для обновления
        const existingHolidayIndex = holidayAdjustments.findIndex(
            h => h.month === month && h.day === day
        );

        if (existingHolidayIndex === -1) {
            throw new Error(`Праздничный день ${day}.${month} не найден`);
        }

        // Обновляем процент
        holidayAdjustments[existingHolidayIndex].percent = percent;

        await tariff.update({
            holidayAdjustments
        }, { transaction });

        // Инвалидируем кеш
        const redisKey = getRedisKey(cityId, carClassId);
        await redis.del(redisKey);

        // Создаем запись в истории
        const { TariffHistory } = await import('./tariff-history.model.js');
        await TariffHistory.create({
            tariffId: tariff.id,
            cityId,
            carClassId,
            oldValues: JSON.stringify(tariff._previousDataValues),
            newValues: JSON.stringify(tariff.dataValues),
            changedBy: adminId,
            changeReason: reason || `Обновлен праздничный день ${day}.${month} с корректировкой ${percent}%`
        }, { transaction });

        await transaction.commit();

        logger.info('Праздничный день обновлен', {
            cityId,
            carClassId,
            month,
            day,
            percent,
            adminId
        });

        return tariff;
    } catch (error) {
        await transaction.rollback();
        logger.error('Ошибка при обновлении праздничного дня', {
            error: error.message,
            cityId,
            carClassId,
            month,
            day,
            percent
        });
        throw error;
    }
};

// Удаление праздничного дня
export const deleteHoliday = async (cityId, carClassId, month, day, adminId, reason) => {
    const transaction = await Tariff.sequelize.transaction();
    try {
        const tariff = await Tariff.findOne({
            where: {
                cityId,
                carClassId,
                isActive: true
            },
            transaction
        });

        if (!tariff) {
            throw new Error('Тариф не найден');
        }

        // Клонируем текущие праздничные дни
        const holidayAdjustments = [...tariff.holidayAdjustments];
        
        // Находим праздник для удаления
        const existingHolidayIndex = holidayAdjustments.findIndex(
            h => h.month === month && h.day === day
        );

        if (existingHolidayIndex === -1) {
            throw new Error(`Праздничный день ${day}.${month} не найден`);
        }

        // Удаляем праздник
        holidayAdjustments.splice(existingHolidayIndex, 1);

        await tariff.update({
            holidayAdjustments
        }, { transaction });

        // Инвалидируем кеш
        const redisKey = getRedisKey(cityId, carClassId);
        await redis.del(redisKey);

        // Создаем запись в истории
        const { TariffHistory } = await import('./tariff-history.model.js');
        await TariffHistory.create({
            tariffId: tariff.id,
            cityId,
            carClassId,
            oldValues: JSON.stringify(tariff._previousDataValues),
            newValues: JSON.stringify(tariff.dataValues),
            changedBy: adminId,
            changeReason: reason || `Удален праздничный день ${day}.${month}`
        }, { transaction });

        await transaction.commit();

        logger.info('Праздничный день удален', {
            cityId,
            carClassId,
            month,
            day,
            adminId
        });

        return tariff;
    } catch (error) {
        await transaction.rollback();
        logger.error('Ошибка при удалении праздничного дня', {
            error: error.message,
            cityId,
            carClassId,
            month,
            day
        });
        throw error;
    }
};

// Обновление базового тарифа для города и класса автомобиля
export const updateBaseTariff = async (cityId, carClassId, baseFare, costPerKm, costPerMinute, adminId, reason) => {
    const transaction = await Tariff.sequelize.transaction();
    try {
        const tariff = await Tariff.findOne({
            where: {
                cityId,
                carClassId,
                isActive: true
            },
            transaction
        });

        if (!tariff) {
            throw new Error('Тариф не найден');
        }

        await tariff.update({
            baseFare,
            costPerKm,
            costPerMinute
        }, { transaction });

        // Инвалидируем кеш
        const redisKey = getRedisKey(cityId, carClassId);
        await redis.del(redisKey);

        // Создаем запись в истории
        const { TariffHistory } = await import('./tariff-history.model.js');
        await TariffHistory.create({
            tariffId: tariff.id,
            cityId,
            carClassId,
            oldValues: JSON.stringify(tariff._previousDataValues),
            newValues: JSON.stringify(tariff.dataValues),
            changedBy: adminId,
            changeReason: reason || `Обновлен базовый тариф: baseFare=${baseFare}, costPerKm=${costPerKm}, costPerMinute=${costPerMinute}`
        }, { transaction });

        await transaction.commit();

        logger.info('Базовый тариф обновлен', {
            cityId,
            carClassId,
            baseFare,
            costPerKm,
            costPerMinute,
            adminId
        });

        return tariff;
    } catch (error) {
        await transaction.rollback();
        logger.error('Ошибка при обновлении базового тарифа', {
            error: error.message,
            cityId,
            carClassId,
            baseFare,
            costPerKm,
            costPerMinute
        });
        throw error;
    }
};

export const createTariffInService = async (tariffData, correlationId, adminId) => {
    const transaction = await Tariff.sequelize.transaction();
    try {
        const { cityId, carClassId } = tariffData;

        // Проверяем существующий тариф
        const existingTariff = await Tariff.findOne({
            where: {
                cityId,
                carClassId,
                isActive: true
            },
            transaction
        });

        if (existingTariff) {
            throw new Error('Активный тариф для этих параметров уже существует');
        }

        // Создаем новый тариф
        const tariff = await Tariff.create({
            ...tariffData,
            createdBy: adminId
        }, { transaction });

        // Создаем запись в истории
        const { TariffHistory } = await import('./tariff-history.model.js');
        await TariffHistory.create({
            tariffId: tariff.id,
            cityId,
            carClassId,
            newValues: JSON.stringify(tariff.dataValues),
            changedBy: adminId,
            changeReason: 'Создание нового тарифа'
        }, { transaction });

        // Инвалидируем кеш
        const redisKey = getRedisKey(cityId, carClassId);
        await redis.del(redisKey);

        await transaction.commit();

        logger.info('Новый тариф создан', {
            tariffId: tariff.id,
            cityId,
            carClassId,
            correlationId,
            adminId
        });

        return tariff;
    } catch (error) {
        await transaction.rollback();
        logger.error('Ошибка при создании тарифа', {
            error: error.message,
            tariffData,
            correlationId,
            adminId
        });
        throw error;
    }
};

export const getTariffsFromService = async (cityId, carClassId) => {
    try {
        const redisKey = getRedisKey(cityId, carClassId);
        
        // Пробуем получить из кеша
        let tariffs = await redis.get(redisKey);
        if (tariffs) {
            logger.info('Тарифы загружены из Redis', { cityId, carClassId });
            return JSON.parse(tariffs);
        }

        // Получаем из БД
        tariffs = await Tariff.findAll({
            where: {
                cityId,
                carClassId,
                isActive: true
            },
            order: [
                ['month', 'ASC'],
                ['hour', 'ASC']
            ]
        });

        if (!tariffs.length) {
            throw new Error('Тарифы не найдены');
        }

        // Преобразуем и добавляем effectivePrice
        const processedTariffs = tariffs.map(tariff => ({
            ...tariff.dataValues,
            effectivePrice: calculateEffectivePrice(tariff)
        }));

        // Кешируем результат
        await redis.set(redisKey, JSON.stringify(processedTariffs), { EX: 3600 });

        return processedTariffs;
    } catch (error) {
        logger.error('Ошибка при получении тарифов', {
            error: error.message,
            cityId,
            carClassId
        });
        throw error;
    }
};

// Вспомогательная функция для расчета эффективной цены
const calculateEffectivePrice = (tariff) => {
    const basePrice = tariff.baseFare;
    const seasonalMultiplier = tariff.seasonalMultiplier || 1.0;
    return basePrice * seasonalMultiplier;
};
