import { getChannel } from '../utils/rabbitmq.js';
import logger from '../utils/logger.js';
import redis from '../utils/redis.js';
import Tariff from '../models/tarrif.model.js';

export const getTariffs = async () => {
    try {
        let cachedTariffs = await redis.get('tariffs');
        console.log({ cachedTariffs});
        if (cachedTariffs || cachedTariffs !== '{}') {
            logger.info('tariff.service: тарифы загружены из Redis');
            return JSON.parse(cachedTariffs);
        }

        const tariffsFromDB = await Tariff.findAll();
        console.log({ tariffsFromDB });
        const tariffs = tariffsFromDB.reduce((acc, tariff) => {
            console.log({ tariff });
            acc[tariff.city] = {
                baseFare: tariff.baseFare,
                costPerKm: tariff.costPerKm,
                costPerMinute: tariff.costPerMinute
            };
            return acc;
        }, {});

        await redis.set('tariffs', JSON.stringify(tariffs));
        logger.info('tariff.service: тарифы загружены из базы данных и кешированы');
        return tariffs;
    } catch (error) {
        logger.error('tariff.service: ошибка при загрузке тарифов', { error: error.message });
        throw new Error('Не удалось загрузить тарифы');
    }
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
        const tariffRecord = await Tariff.findOne({ where: { city } });
        if (tariffRecord) {
            return {
                baseFare: tariffRecord.baseFare,
                costPerKm: tariffRecord.costPerKm,
                costPerMinute: tariffRecord.costPerMinute,
            };
        }
        return null;
    } catch (error) {
        logger.error('tariff.service: ошибка при обращении к базе данных', { city, error: error.message });
        throw new Error('Ошибка при обращении к базе данных');
    }
};

export const updateTariff = async (city, newTariff) => {
    const transaction = await Tariff.sequelize.transaction();
    try {
        const [updatedRows] = await Tariff.update(newTariff, { where: { city }, transaction });
        if (updatedRows === 0) {
            throw new Error(`Тариф для города "${city}" не найден`);
        }

        await redis.set(`tariff:${city}`, JSON.stringify(newTariff), {
            EX: 3600,
        });
        logger.info('tariff.service: тариф обновлён и кэш обновлён', { city, newTariff });

        await transaction.commit();
    } catch (error) {
        await transaction.rollback();
        logger.error('tariff.service: ошибка при обновлении тарифа', { city, error: error.message });
        throw new Error('Не удалось обновить тариф');
    }
};

export const addTariff = async (city, tariff) => {
    const transaction = await Tariff.sequelize.transaction();
    try {
        await Tariff.create({ city, ...tariff }, { transaction });

        await redis.set(`tariff:${city}`, JSON.stringify(tariff), {
            EX: 3600,
        });
        logger.info('tariff.service: новый тариф добавлен и кеширован', { city, tariff });

        await transaction.commit();
    } catch (error) {
        await transaction.rollback();
        logger.error('tariff.service: ошибка при добавлении тарифа', { city, error: error.message });
        throw new Error('Не удалось добавить тариф');
    }
};

export const updateTariffForCity = async (city, data) => {
    try {
        const tariffs = await getTariffs();
        tariffs[city] = { ...data };

        await redis.set('tariffs', JSON.stringify(tariffs));
        await Tariff.upsert({ city, ...data });

        logger.info('tariff.service: тариф для города обновлен', { city, data });
    } catch (error) {
        logger.error('tariff.service: ошибка при обновлении тарифа для города', { city, error: error.message });
        throw new Error('Не удалось обновить тариф для города');
    }
};

export const updateTariffsFromMessage = async (newTariffs, correlationId) => {
    try {
        for (const [city, data] of Object.entries(newTariffs)) {
            await updateTariffForCity(city, data);
        }

        logger.info('tariff.service: тарифы обновлены через RabbitMQ', { tariffs: newTariffs, correlationId });
    } catch (error) {
        logger.error('tariff.service: ошибка при массовом обновлении тарифов', { error: error.message, correlationId });
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

export const calculatePriceForCity = async (city, distance, duration) => {
    try {
        const tariff = await getCityTariff(city);

        const { baseFare, costPerKm, costPerMinute } = tariff;
        const price = baseFare + costPerKm * distance + costPerMinute * duration;

        logger.info('tariff.service: стоимость поездки рассчитана', { city, distance, duration, price });
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
