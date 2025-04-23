import { CarClass } from "../models/car-class.model.js";
import City from "../models/city.model.js";
import TariffHistory from "../models/tariff-history.model.js";
import Tariff from "../models/tarrif.model.js";
import logger from "../utils/logger.js";
import { getChannel } from "../utils/rabbitmq.js";
import redis from "../utils/redis.js";

const getRedisKey = (cityId, carClassId) => `tariff:${cityId}:${carClassId}`;

const getHourAdjustmentPercent = (hour, hourlyAdjustments) => {
  if (Array.isArray(hourlyAdjustments)) {
    const adjustment = hourlyAdjustments.find((adj) => adj.hour === hour);
    return adjustment ? adjustment.percent : 0;
  } else {
    const hourKey = hour.toString();
    return hourlyAdjustments[hourKey] || 0;
  }
};

const getMonthAdjustmentPercent = (month, monthlyAdjustments) => {
  if (Array.isArray(monthlyAdjustments)) {
    const adjustment = monthlyAdjustments.find((adj) => adj.month === month);
    return adjustment ? adjustment.percent : 0;
  } else {
    const monthKey = month.toString();
    return monthlyAdjustments[monthKey] || 0;
  }
};

const getHolidayAdjustmentPercent = (date, holidayAdjustments) => {
  const month = date.getMonth() + 1;
  const day = date.getDate();

  const holiday = holidayAdjustments.find(
    (h) => h.month === month && h.day === day
  );
  return holiday ? holiday.percent : 0;
};

export const getTariff = async (cityId) => {
  try {
    const tariffs = await Tariff.findAll({
      where: {
        cityId,
        isActive: true,
      },
      include: [
        {
          model: CarClass,
          as: "car_class",
        },
        {
          model: City,
          foreignKey: "cityId",
        },
      ],
    });

    if (!tariffs || tariffs.length === 0) {
      logger.warn("Тарифы не найдены", { cityId });
      throw new Error("Тарифы не найдены");
    }

    for (const tariff of tariffs) {
      const redisKey = getRedisKey(cityId, tariff.carClassId);
      await redis.set(redisKey, JSON.stringify(tariff), { EX: 3600 });
    }

    logger.info("Тарифы загружены из БД и закешированы", { cityId });

    const formattedTariffs = tariffs.map((tariff) => {
      const effectivePrice = calculateEffectivePrice(tariff);
      return {
        ...tariff.get({ plain: true }),
        effectivePrice,
      };
    });

    return formattedTariffs;
  } catch (error) {
    logger.error("Ошибка при получении тарифов", {
      error: error.message,
      cityId,
    });
    throw error;
  }
};

export const getCityTariff = async (city) => {
  try {
    let tariff = await redis.get(`tariff:${city}`);
    tariff = tariff ? JSON.parse(tariff) : null;
    console.log("tarrif from redis:", tariff);
    if (tariff) {
      logger.info("tariff.service: тариф загружен из Redis", { city });
      return tariff;
    }

    if (!tariff) {
      tariff = await getTariffFromDB(city);
      console.log("tarrif from db:", tariff);
      await redis.set(`tariff:${city}`, JSON.stringify(tariff), {
        EX: 3600,
      });
      logger.info("tariff.service: тариф загружен из БД и кеширован", { city });
      return tariff;
    } else {
      logger.warn(
        "tariff.service: тариф для города не найден или город не поддерживается",
        { city }
      );
      throw new Error(
        `Тариф для города "${city}" не найден или город не поддерживается`
      );
    }
  } catch (error) {
    logger.warn("tariff.service: ошибка при получении тарифа для города", {
      city,
      error: error.message,
    });
    throw error;
  }
};

const getTariffFromDB = async (city) => {
  try {
    const cityRecord = await City.findOne({ where: { name: city } });

    if (!cityRecord) {
      logger.warn("tariff.service: город не найден в базе данных", { city });
      return null;
    }

    const tariffRecord = await Tariff.findOne({
      where: {
        cityId: cityRecord.id,
        carClassId: 1,
        isActive: true,
      },
    });

    if (tariffRecord) {
      return {
        baseFare: tariffRecord.baseFare,
        costPerKm: tariffRecord.costPerKm,
        costPerMinute: tariffRecord.costPerMinute,
        monthlyAdjustments: tariffRecord.monthlyAdjustments,
        hourlyAdjustments: tariffRecord.hourlyAdjustments,
        holidayAdjustments: tariffRecord.holidayAdjustments,
        serviceFeePercent: tariffRecord.serviceFeePercent,
      };
    }

    return null;
  } catch (error) {
    logger.error("tariff.service: ошибка при обращении к базе данных", {
      city,
      error: error.message,
    });
    throw new Error("Ошибка при обращении к базе данных");
  }
};

export const updateTariff = async (
  cityId,
  carClassId,
  newTariffData,
  adminId,
  reason
) => {
  const transaction = await Tariff.sequelize.transaction();

  try {
    const tariff = await Tariff.findOne({
      where: {
        cityId,
        carClassId,
        isActive: true,
      },
      transaction,
    });

    if (!tariff) throw new Error("Тариф не найден");

    let processedTariffData = { ...newTariffData };

    if (
      processedTariffData.hourlyAdjustments &&
      !Array.isArray(processedTariffData.hourlyAdjustments)
    ) {
      processedTariffData.hourlyAdjustments = Object.entries(
        processedTariffData.hourlyAdjustments
      ).map(([hour, percent]) => ({ hour: parseInt(hour), percent }));
    }

    if (
      processedTariffData.monthlyAdjustments &&
      !Array.isArray(processedTariffData.monthlyAdjustments)
    ) {
      processedTariffData.monthlyAdjustments = Object.entries(
        processedTariffData.monthlyAdjustments
      ).map(([month, percent]) => ({ month: parseInt(month), percent }));
    }

    await tariff.update(
      {
        ...processedTariffData,
        updatedBy: adminId,
      },
      { transaction }
    );

    const redisKey = getRedisKey(cityId, carClassId);
    await redis.del(redisKey);

    await TariffHistory.create(
      {
        tariffId: tariff.id,
        cityId,
        carClassId,
        oldValues: JSON.stringify(tariff._previousDataValues),
        newValues: JSON.stringify(tariff.dataValues),
        changedBy: adminId,
        changeReason: reason || "Обновление тарифа",
      },
      { transaction }
    );

    await transaction.commit();

    logger.info("Тариф обновлен", {
      cityId,
      carClassId,
      adminId,
    });

    return tariff;
  } catch (error) {
    await transaction.rollback();
    logger.error("Ошибка при обновлении тарифа", {
      error: error.message,
      cityId,
      carClassId,
    });
    throw error;
  }
};

export const addTariff = async (tariffData, adminId) => {
  const transaction = await Tariff.sequelize.transaction();
  try {
    const { cityId, carClassId } = tariffData;

    const existingTariff = await Tariff.findOne({
      where: {
        cityId,
        carClassId,
        isActive: true,
      },
    });

    if (existingTariff) {
      throw new Error("Активный тариф для этих параметров уже существует");
    }

    let processedTariffData = { ...tariffData };

    if (
      processedTariffData.hourlyAdjustments &&
      !Array.isArray(processedTariffData.hourlyAdjustments)
    ) {
      processedTariffData.hourlyAdjustments = Object.entries(
        processedTariffData.hourlyAdjustments
      ).map(([hour, percent]) => ({ hour: parseInt(hour), percent }));
    }

    if (
      processedTariffData.monthlyAdjustments &&
      !Array.isArray(processedTariffData.monthlyAdjustments)
    ) {
      processedTariffData.monthlyAdjustments = Object.entries(
        processedTariffData.monthlyAdjustments
      ).map(([month, percent]) => ({ month: parseInt(month), percent }));
    }

    const tariff = await Tariff.create(
      {
        ...processedTariffData,
        createdBy: adminId,
      },
      { transaction }
    );

    const redisKey = getRedisKey(cityId, carClassId);
    await redis.set(redisKey, JSON.stringify(tariff), { EX: 3600 });

    logger.info("Новый тариф добавлен и кеширован", {
      cityId,
      carClassId,
      adminId,
    });

    await transaction.commit();
    return tariff;
  } catch (error) {
    await transaction.rollback();
    logger.error("Ошибка при добавлении тарифа", {
      error: error.message,
      tariffData,
    });
    throw error;
  }
};

export const updateTariffForCity = async (tariffData) => {
  const { cityId, carClassId } = tariffData;
  try {
    let processedTariffData = { ...tariffData };

    if (
      processedTariffData.hourlyAdjustments &&
      !Array.isArray(processedTariffData.hourlyAdjustments)
    ) {
      processedTariffData.hourlyAdjustments = Object.entries(
        processedTariffData.hourlyAdjustments
      ).map(([hour, percent]) => ({ hour: parseInt(hour), percent }));
    }

    if (
      processedTariffData.monthlyAdjustments &&
      !Array.isArray(processedTariffData.monthlyAdjustments)
    ) {
      processedTariffData.monthlyAdjustments = Object.entries(
        processedTariffData.monthlyAdjustments
      ).map(([month, percent]) => ({ month: parseInt(month), percent }));
    }

    const tariff = await Tariff.findOne({
      where: {
        cityId,
        carClassId,
        isActive: true,
      },
    });

    if (tariff) {
      await tariff.update(processedTariffData);
    } else {
      await Tariff.create(processedTariffData);
    }

    const redisKey = getRedisKey(cityId, carClassId);
    await redis.del(redisKey);

    logger.info("tariff.service: тариф обновлен", {
      cityId,
      carClassId,
    });
  } catch (error) {
    logger.error("tariff.service: ошибка при обновлении тарифа", {
      error: error.message,
      tariffData,
    });
    throw new Error("Не удалось обновить тариф");
  }
};

export const updateTariffsFromMessage = async (newTariffs, correlationId) => {
  try {
    for (const [cityId, cityTariffs] of Object.entries(newTariffs)) {
      for (const [carClassId, tariffData] of Object.entries(cityTariffs)) {
        await updateTariffForCity({
          cityId: parseInt(cityId),
          carClassId: parseInt(carClassId),
          ...tariffData,
        });
      }
    }

    logger.info("tariff.service: тарифы обновлены через RabbitMQ", {
      correlationId,
      citiesCount: Object.keys(newTariffs).length,
    });
  } catch (error) {
    logger.error("tariff.service: ошибка при массовом обновлении тарифов", {
      error: error.message,
      correlationId,
    });
    throw new Error("Не удалось обновить тарифы");
  }
};

export const validateCitySupported = async (city) => {
  try {
    const tariff = await getCityTariff(city);
    logger.info("tariff.service: город поддерживается", { city });
    return !!tariff;
  } catch (error) {
    logger.warn("tariff.service: город не поддерживается", {
      city,
      error: error.message,
    });
    return false;
  }
};

export const calculatePrice = async ({
  cityId,
  carClassId,
  distance,
  duration,
}) => {
  const now = new Date();
  const hour = now.getHours();
  const month = now.getMonth() + 1;
  const tariff = await getTariff(cityId);

  const holidayPercent = getHolidayAdjustmentPercent(
    now,
    tariff.holidayAdjustments
  );
  const hourPercent = getHourAdjustmentPercent(hour, tariff.hourlyAdjustments);
  const monthPercent = getMonthAdjustmentPercent(
    month,
    tariff.monthlyAdjustments
  );

  let appliedPercent = 0;
  let appliedType = "none";

  if (holidayPercent !== 0) {
    appliedPercent = holidayPercent;
    appliedType = "holiday";
  } else if (hourPercent !== 0) {
    appliedPercent = hourPercent;
    appliedType = "hour";
  } else if (monthPercent !== 0) {
    appliedPercent = monthPercent;
    appliedType = "month";
  }

  const adjustedCostPerKm = tariff.costPerKm * (1 + appliedPercent / 100);

  const { baseFare, costPerMinute, serviceFeePercent = 0 } = tariff;

  const price =
    baseFare + adjustedCostPerKm * distance + costPerMinute * duration;
  const serviceFee = (price * serviceFeePercent) / 100;

  logger.info("Стоимость поездки рассчитана", {
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
    monthPercent,
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
      description: tariff.description,
    },
  };
};

export const calculatePriceForCity = async (city, distance, duration) => {
  try {
    const now = new Date();
    const hour = now.getHours();
    const month = now.getMonth() + 1;
    const tariff = await getCityTariff(city);

    if (!tariff) {
      throw new Error(`Тариф для города "${city}" не найден`);
    }

    const holidayPercent = getHolidayAdjustmentPercent(
      now,
      tariff.holidayAdjustments || []
    );
    const hourPercent = getHourAdjustmentPercent(
      hour,
      tariff.hourlyAdjustments || {}
    );
    const monthPercent = getMonthAdjustmentPercent(
      month,
      tariff.monthlyAdjustments || {}
    );

    let appliedPercent = 0;
    let appliedType = "none";

    if (holidayPercent !== 0) {
      appliedPercent = holidayPercent;
      appliedType = "holiday";
    } else if (hourPercent !== 0) {
      appliedPercent = hourPercent;
      appliedType = "hour";
    } else if (monthPercent !== 0) {
      appliedPercent = monthPercent;
      appliedType = "month";
    }

    const adjustedCostPerKm = tariff.costPerKm * (1 + appliedPercent / 100);

    const price =
      tariff.baseFare +
      adjustedCostPerKm * distance +
      tariff.costPerMinute * duration;

    logger.info("tariff.service: стоимость поездки рассчитана", {
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
      month,
    });

    return price.toFixed(2);
  } catch (error) {
    logger.error("tariff.service: ошибка при расчете стоимости поездки", {
      city,
      error: error.message,
    });
    throw new Error("Не удалось рассчитать стоимость поездки");
  }
};

export const subscribeToTariffUpdates = async () => {
  const channel = await getChannel();
  const exchangeName = "settings_events";

  await channel.assertExchange(exchangeName, "fanout", { durable: true });
  const q = await channel.assertQueue("", { exclusive: true });
  await channel.bindQueue(q.queue, exchangeName, "");

  channel.consume(
    q.queue,
    async (msg) => {
      try {
        if (!msg.content) {
          logger.warn("tariff.service: пустое сообщение RabbitMQ");
          return;
        }

        const message = JSON.parse(msg.content.toString());
        const correlationId = msg.properties.headers["x-correlation-id"];

        if (message.event === "settings_updated" && message.data) {
          await updateTariffsFromMessage(message.data, correlationId);
          logger.info("tariff.service: тарифы обновлены через RabbitMQ", {
            correlationId,
          });
        } else {
          logger.warn(
            "tariff.service: неизвестное событие или отсутствуют данные",
            { message }
          );
        }
      } catch (error) {
        logger.error(
          "tariff.service: ошибка при обработке сообщения RabbitMQ",
          { error: error.message }
        );
      }
    },
    { noAck: true }
  );
};

export const getTariffs = async (cityId, carClassId) => {
  try {
    const tariffs = await Tariff.findAll({
      where: {
        cityId,
        carClassId,
        isActive: true,
      },
      order: [
        ["month", "ASC"],
        ["hour", "ASC"],
      ],
    });

    return tariffs.map((tariff) => ({
      ...tariff.dataValues,
      effectivePrice: tariff.baseFare * tariff.seasonalMultiplier,
    }));
  } catch (error) {
    logger.error("Ошибка при получении тарифов", {
      cityId,
      carClassId,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Обновляет или добавляет месячную корректировку для тарифа
 * @param {number} cityId - ID города
 * @param {number} carClassId - ID класса автомобиля
 * @param {number} month - Месяц (1-12)
 * @param {number} percent - Процент корректировки (-100 до 500)
 * @param {number} adminId - ID администратора, выполняющего изменение
 * @param {string} [reason] - Причина изменения
 * @returns {Promise<Object>} - Обновленный тариф
 * @throws {Error} Если тариф не найден или данные некорректны
 */
export const updateMonthAdjustment = async (
  cityId,
  carClassId,
  month,
  percent,
  adminId,
  reason
) => {
  try {
    if (!cityId || isNaN(parseInt(cityId))) {
      throw new Error("ID города должен быть числом");
    }

    if (!carClassId || isNaN(parseInt(carClassId))) {
      throw new Error("ID класса автомобиля должен быть числом");
    }

    if (
      month === undefined ||
      isNaN(parseInt(month)) ||
      month < 1 ||
      month > 12
    ) {
      throw new Error("Месяц должен быть числом от 1 до 12");
    }

    if (
      percent === undefined ||
      isNaN(parseFloat(percent)) ||
      percent < -100 ||
      percent > 500
    ) {
      throw new Error(
        "Процент корректировки должен быть числом от -100 до 500"
      );
    }

    if (!adminId) {
      throw new Error("ID администратора обязателен");
    }

    cityId = parseInt(cityId);
    carClassId = parseInt(carClassId);
    month = parseInt(month);
    percent = parseFloat(percent);

    const tariff = await Tariff.findOne({
      where: {
        cityId,
        carClassId,
        isActive: true,
      },
    });

    if (!tariff) {
      throw new Error("Тариф не найден");
    }

    console.log("tariff", tariff);

    let monthlyAdjustments = Array.isArray(tariff.monthlyAdjustments)
      ? [...tariff.monthlyAdjustments]
      : Object.entries(tariff.monthlyAdjustments || {}).map(
          ([month, percent]) => ({
            month: parseInt(month),
            percent,
          })
        );

    console.log("monthlyAdjustments", monthlyAdjustments);

    const existingIndex = monthlyAdjustments.findIndex(
      (adj) => adj.month === month
    );
    console.log("existingIndex", existingIndex);

    if (existingIndex !== -1) {
      monthlyAdjustments[existingIndex].percent = percent;
    } else {
      monthlyAdjustments.push({ month, percent });
    }

    await Tariff.update(
      { monthlyAdjustments },
      {
        where: { id: tariff.id },
      }
    );

    await TariffHistory.create({
      tariffId: tariff.id,
      cityId,
      carClassId,
      oldValues: JSON.stringify(tariff.dataValues),
      newValues: JSON.stringify({
        ...tariff.dataValues,
        monthlyAdjustments,
      }),
      changedBy: adminId,
      changeReason:
        reason ||
        `Изменена месячная корректировка для месяца ${month}: ${percent}%`,
    });

    const redisKey = getRedisKey(cityId, carClassId);
    await redis.del(redisKey);

    logger.info("Месячная корректировка обновлена", {
      cityId,
      carClassId,
      month,
      percent,
      adminId,
    });

    return {
      ...tariff.dataValues,
      monthlyAdjustments,
    };
  } catch (error) {
    logger.error("Ошибка при обновлении месячной корректировки", {
      error: error.message,
      cityId,
      carClassId,
      month,
      percent,
    });
    throw error;
  }
};

export const deleteMonthAdjustment = async (
  cityId,
  carClassId,
  month,
  adminId,
  reason
) => {
  const transaction = await Tariff.sequelize.transaction();
  try {
    const tariff = await Tariff.findOne({
      where: {
        cityId,
        carClassId,
        isActive: true,
      },
      transaction,
    });

    if (!tariff) {
      throw new Error("Тариф не найден");
    }

    let monthlyAdjustments = [
      ...(Array.isArray(tariff.monthlyAdjustments)
        ? tariff.monthlyAdjustments
        : Object.entries(tariff.monthlyAdjustments).map(([month, percent]) => ({
            month: parseInt(month),
            percent,
          }))),
    ];

    const existingIndex = monthlyAdjustments.findIndex(
      (adj) => adj.month === month
    );

    if (existingIndex !== -1) {
      monthlyAdjustments.splice(existingIndex, 1);
    } else {
      throw new Error(`Корректировка для месяца ${month} не найдена`);
    }

    await tariff.update(
      {
        monthlyAdjustments,
      },
      { transaction }
    );

    const redisKey = getRedisKey(cityId, carClassId);
    await redis.del(redisKey);

    await TariffHistory.create(
      {
        tariffId: tariff.id,
        cityId,
        carClassId,
        oldValues: JSON.stringify(tariff._previousDataValues),
        newValues: JSON.stringify(tariff.dataValues),
        changedBy: adminId,
        changeReason:
          reason || `Удалена месячная корректировка для месяца ${month}`,
      },
      { transaction }
    );

    await transaction.commit();

    logger.info("Месячная корректировка удалена", {
      cityId,
      carClassId,
      month,
      adminId,
    });

    return tariff;
  } catch (error) {
    await transaction.rollback();
    logger.error("Ошибка при удалении месячной корректировки", {
      error: error.message,
      cityId,
      carClassId,
      month,
    });
    throw error;
  }
};

export const updateHourAdjustment = async (
  cityId,
  carClassId,
  hour,
  percent,
  adminId,
  reason
) => {
  try {
    if (!cityId || isNaN(parseInt(cityId))) {
      throw new Error("ID города должен быть числом");
    }

    if (!carClassId || isNaN(parseInt(carClassId))) {
      throw new Error("ID класса автомобиля должен быть числом");
    }

    if (hour === undefined || isNaN(parseInt(hour)) || hour < 0 || hour > 23) {
      throw new Error("Час должен быть числом от 0 до 23");
    }

    if (
      percent === undefined ||
      isNaN(parseFloat(percent)) ||
      percent < -100 ||
      percent > 500
    ) {
      throw new Error(
        "Процент корректировки должен быть числом от -100 до 500"
      );
    }

    if (!adminId) {
      throw new Error("ID администратора обязателен");
    }

    cityId = parseInt(cityId);
    carClassId = parseInt(carClassId);
    hour = parseInt(hour);
    percent = parseFloat(percent);

    const tariff = await Tariff.findOne({
      where: {
        cityId,
        carClassId,
        isActive: true,
      },
    });

    if (!tariff) {
      throw new Error("Тариф не найден");
    }

    console.log("tariff", tariff);

    let hourlyAdjustments = Array.isArray(tariff.hourlyAdjustments)
      ? [...tariff.hourlyAdjustments]
      : Object.entries(tariff.hourlyAdjustments || {}).map(
          ([hour, percent]) => ({
            hour: parseInt(hour),
            percent,
          })
        );

    console.log("hourlyAdjustments", hourlyAdjustments);

    const existingIndex = hourlyAdjustments.findIndex(
      (adj) => adj.hour === hour
    );
    console.log("existingIndex", existingIndex);

    if (existingIndex !== -1) {
      hourlyAdjustments[existingIndex].percent = percent;
    } else {
      hourlyAdjustments.push({ hour, percent });
    }

    await Tariff.update(
      { hourlyAdjustments },
      {
        where: { id: tariff.id },
      }
    );

    await TariffHistory.create({
      tariffId: tariff.id,
      cityId,
      carClassId,
      oldValues: JSON.stringify(tariff.dataValues),
      newValues: JSON.stringify({
        ...tariff.dataValues,
        hourlyAdjustments,
      }),
      changedBy: adminId,
      changeReason:
        reason ||
        `Изменена часовая корректировка для часа ${hour}: ${percent}%`,
    });

    const redisKey = getRedisKey(cityId, carClassId);
    await redis.del(redisKey);

    logger.info("Часовая корректировка обновлена", {
      cityId,
      carClassId,
      hour,
      percent,
      adminId,
    });

    return {
      ...tariff.dataValues,
      hourlyAdjustments,
    };
  } catch (error) {
    logger.error("Ошибка при обновлении часовой корректировки", {
      error: error.message,
      cityId,
      carClassId,
      hour,
      percent,
    });
    throw error;
  }
};

export const deleteHourAdjustment = async (
  cityId,
  carClassId,
  hour,
  adminId,
  reason
) => {
  const transaction = await Tariff.sequelize.transaction();
  try {
    const tariff = await Tariff.findOne({
      where: {
        cityId,
        carClassId,
        isActive: true,
      },
      transaction,
    });

    if (!tariff) {
      throw new Error("Тариф не найден");
    }

    let hourlyAdjustments = [
      ...(Array.isArray(tariff.hourlyAdjustments)
        ? tariff.hourlyAdjustments
        : Object.entries(tariff.hourlyAdjustments).map(([hour, percent]) => ({
            hour: parseInt(hour),
            percent,
          }))),
    ];

    const existingIndex = hourlyAdjustments.findIndex(
      (adj) => adj.hour === hour
    );

    if (existingIndex !== -1) {
      hourlyAdjustments.splice(existingIndex, 1);
    } else {
      throw new Error(`Корректировка для часа ${hour} не найдена`);
    }

    await tariff.update(
      {
        hourlyAdjustments,
      },
      { transaction }
    );

    const redisKey = getRedisKey(cityId, carClassId);
    await redis.del(redisKey);

    await TariffHistory.create(
      {
        tariffId: tariff.id,
        cityId,
        carClassId,
        oldValues: JSON.stringify(tariff._previousDataValues),
        newValues: JSON.stringify(tariff.dataValues),
        changedBy: adminId,
        changeReason:
          reason || `Удалена часовая корректировка для часа ${hour}`,
      },
      { transaction }
    );

    await transaction.commit();

    logger.info("Часовая корректировка удалена", {
      cityId,
      carClassId,
      hour,
      adminId,
    });

    return tariff;
  } catch (error) {
    await transaction.rollback();
    logger.error("Ошибка при удалении часовой корректировки", {
      error: error.message,
      cityId,
      carClassId,
      hour,
    });
    throw error;
  }
};

export const addHoliday = async (
  cityId,
  carClassId,
  month,
  day,
  percent,
  adminId,
  reason
) => {
  try {
    if (!cityId || isNaN(parseInt(cityId))) {
      throw new Error("ID города должен быть числом");
    }

    if (!carClassId || isNaN(parseInt(carClassId))) {
      throw new Error("ID класса автомобиля должен быть числом");
    }

    if (
      month === undefined ||
      isNaN(parseInt(month)) ||
      month < 1 ||
      month > 12
    ) {
      throw new Error("Месяц должен быть числом от 1 до 12");
    }

    if (day === undefined || isNaN(parseInt(day)) || day < 1 || day > 31) {
      throw new Error("День должен быть числом от 1 до 31");
    }

    if (
      (month === 4 || month === 6 || month === 9 || month === 11) &&
      day > 30
    ) {
      throw new Error(`В месяце ${month} не может быть больше 30 дней`);
    }

    if (month === 2) {
      const maxDay = 29;
      if (day > maxDay) {
        throw new Error(`В феврале не может быть больше ${maxDay} дней`);
      }
    }

    if (
      percent === undefined ||
      isNaN(parseFloat(percent)) ||
      percent < -100 ||
      percent > 500
    ) {
      throw new Error(
        "Процент корректировки должен быть числом от -100 до 500"
      );
    }

    if (!adminId) {
      throw new Error("ID администратора обязателен");
    }

    cityId = parseInt(cityId);
    carClassId = parseInt(carClassId);
    month = parseInt(month);
    day = parseInt(day);
    percent = parseFloat(percent);

    const tariff = await Tariff.findOne({
      where: {
        cityId,
        carClassId,
        isActive: true,
      },
    });

    if (!tariff) {
      throw new Error("Тариф не найден");
    }

    const holidayAdjustments = Array.isArray(tariff.holidayAdjustments)
      ? [...tariff.holidayAdjustments]
      : [];

    const existingHolidayIndex = holidayAdjustments.findIndex(
      (h) => h.month === month && h.day === day
    );

    if (existingHolidayIndex >= 0) {
      throw new Error(`Праздничный день ${day}.${month} уже существует`);
    }

    holidayAdjustments.push({ month, day, percent });

    await Tariff.update(
      { holidayAdjustments },
      {
        where: { id: tariff.id },
      }
    );

    await TariffHistory.create({
      tariffId: tariff.id,
      cityId,
      carClassId,
      oldValues: JSON.stringify(tariff.dataValues),
      newValues: JSON.stringify({
        ...tariff.dataValues,
        holidayAdjustments,
      }),
      changedBy: adminId,
      changeReason:
        reason ||
        `Добавлен праздничный день ${day}.${month} с корректировкой ${percent}%`,
    });

    const redisKey = getRedisKey(cityId, carClassId);
    await redis.del(redisKey);

    logger.info("Праздничный день добавлен", {
      cityId,
      carClassId,
      month,
      day,
      percent,
      adminId,
    });

    return {
      ...tariff.dataValues,
      holidayAdjustments,
    };
  } catch (error) {
    logger.error("Ошибка при добавлении праздничного дня", {
      error: error.message,
      cityId,
      carClassId,
      month,
      day,
      percent,
    });
    throw error;
  }
};

export const updateHoliday = async (
  cityId,
  carClassId,
  month,
  day,
  percent,
  adminId,
  reason
) => {
  try {
    if (!cityId || isNaN(parseInt(cityId))) {
      throw new Error("ID города должен быть числом");
    }

    if (!carClassId || isNaN(parseInt(carClassId))) {
      throw new Error("ID класса автомобиля должен быть числом");
    }

    if (
      month === undefined ||
      isNaN(parseInt(month)) ||
      month < 1 ||
      month > 12
    ) {
      throw new Error("Месяц должен быть числом от 1 до 12");
    }

    if (day === undefined || isNaN(parseInt(day)) || day < 1 || day > 31) {
      throw new Error("День должен быть числом от 1 до 31");
    }

    if (
      percent === undefined ||
      isNaN(parseFloat(percent)) ||
      percent < -100 ||
      percent > 500
    ) {
      throw new Error(
        "Процент корректировки должен быть числом от -100 до 500"
      );
    }

    if (!adminId) {
      throw new Error("ID администратора обязателен");
    }

    cityId = parseInt(cityId);
    carClassId = parseInt(carClassId);
    month = parseInt(month);
    day = parseInt(day);
    percent = parseFloat(percent);

    const tariff = await Tariff.findOne({
      where: {
        cityId,
        carClassId,
        isActive: true,
      },
    });

    if (!tariff) {
      throw new Error("Тариф не найден");
    }

    const holidayAdjustments = Array.isArray(tariff.holidayAdjustments)
      ? [...tariff.holidayAdjustments]
      : [];

    const existingHolidayIndex = holidayAdjustments.findIndex(
      (h) => h.month === month && h.day === day
    );

    if (existingHolidayIndex === -1) {
      throw new Error(`Праздничный день ${day}.${month} не найден`);
    }

    holidayAdjustments[existingHolidayIndex].percent = percent;

    await Tariff.update(
      { holidayAdjustments },
      {
        where: { id: tariff.id },
      }
    );

    await TariffHistory.create({
      tariffId: tariff.id,
      cityId,
      carClassId,
      oldValues: JSON.stringify(tariff.dataValues),
      newValues: JSON.stringify({
        ...tariff.dataValues,
        holidayAdjustments,
      }),
      changedBy: adminId,
      changeReason:
        reason ||
        `Обновлен праздничный день ${day}.${month} с корректировкой ${percent}%`,
    });

    const redisKey = getRedisKey(cityId, carClassId);
    await redis.del(redisKey);

    logger.info("Праздничный день обновлен", {
      cityId,
      carClassId,
      month,
      day,
      percent,
      adminId,
    });

    return {
      ...tariff.dataValues,
      holidayAdjustments,
    };
  } catch (error) {
    logger.error("Ошибка при обновлении праздничного дня", {
      error: error.message,
      cityId,
      carClassId,
      month,
      day,
      percent,
    });
    throw error;
  }
};

export const deleteHoliday = async (
  cityId,
  carClassId,
  month,
  day,
  adminId,
  reason
) => {
  try {
    if (!cityId || isNaN(parseInt(cityId))) {
      throw new Error("ID города должен быть числом");
    }

    if (!carClassId || isNaN(parseInt(carClassId))) {
      throw new Error("ID класса автомобиля должен быть числом");
    }

    if (
      month === undefined ||
      isNaN(parseInt(month)) ||
      month < 1 ||
      month > 12
    ) {
      throw new Error("Месяц должен быть числом от 1 до 12");
    }

    if (day === undefined || isNaN(parseInt(day)) || day < 1 || day > 31) {
      throw new Error("День должен быть числом от 1 до 31");
    }

    if (!adminId) {
      throw new Error("ID администратора обязателен");
    }

    cityId = parseInt(cityId);
    carClassId = parseInt(carClassId);
    month = parseInt(month);
    day = parseInt(day);

    const tariff = await Tariff.findOne({
      where: {
        cityId,
        carClassId,
        isActive: true,
      },
    });

    if (!tariff) {
      throw new Error("Тариф не найден");
    }

    const holidayAdjustments = Array.isArray(tariff.holidayAdjustments)
      ? [...tariff.holidayAdjustments]
      : [];

    const existingHolidayIndex = holidayAdjustments.findIndex(
      (h) => h.month === month && h.day === day
    );

    if (existingHolidayIndex === -1) {
      throw new Error(`Праздничный день ${day}.${month} не найден`);
    }

    holidayAdjustments.splice(existingHolidayIndex, 1);

    await Tariff.update(
      { holidayAdjustments },
      {
        where: { id: tariff.id },
      }
    );

    await TariffHistory.create({
      tariffId: tariff.id,
      cityId,
      carClassId,
      oldValues: JSON.stringify(tariff.dataValues),
      newValues: JSON.stringify({
        ...tariff.dataValues,
        holidayAdjustments,
      }),
      changedBy: adminId,
      changeReason: reason || `Удален праздничный день ${day}.${month}`,
    });

    const redisKey = getRedisKey(cityId, carClassId);
    await redis.del(redisKey);

    logger.info("Праздничный день удален", {
      cityId,
      carClassId,
      month,
      day,
      adminId,
    });

    return {
      ...tariff.dataValues,
      holidayAdjustments,
    };
  } catch (error) {
    logger.error("Ошибка при удалении праздничного дня", {
      error: error.message,
      cityId,
      carClassId,
      month,
      day,
    });
    throw error;
  }
};

export const updateBaseTariff = async (
  cityId,
  carClassId,
  baseFare,
  costPerKm,
  costPerMinute,
  adminId,
  reason
) => {
  const transaction = await Tariff.sequelize.transaction();
  try {
    const tariff = await Tariff.findOne({
      where: {
        cityId,
        carClassId,
        isActive: true,
      },
      transaction,
    });

    if (!tariff) {
      throw new Error("Тариф не найден");
    }

    await tariff.update(
      {
        baseFare,
        costPerKm,
        costPerMinute,
      },
      { transaction }
    );

    const redisKey = getRedisKey(cityId, carClassId);
    await redis.del(redisKey);

    await TariffHistory.create(
      {
        tariffId: tariff.id,
        cityId,
        carClassId,
        oldValues: JSON.stringify(tariff._previousDataValues),
        newValues: JSON.stringify(tariff.dataValues),
        changedBy: adminId,
        changeReason:
          reason ||
          `Обновлен базовый тариф: baseFare=${baseFare}, costPerKm=${costPerKm}, costPerMinute=${costPerMinute}`,
      },
      { transaction }
    );

    await transaction.commit();

    logger.info("Базовый тариф обновлен", {
      cityId,
      carClassId,
      baseFare,
      costPerKm,
      costPerMinute,
      adminId,
    });

    return tariff;
  } catch (error) {
    await transaction.rollback();
    logger.error("Ошибка при обновлении базового тарифа", {
      error: error.message,
      cityId,
      carClassId,
      baseFare,
      costPerKm,
      costPerMinute,
    });
    throw error;
  }
};

export const createTariffInService = async (
  tariffData,
  correlationId,
  adminId
) => {
  const transaction = await Tariff.sequelize.transaction();
  try {
    const { cityId, carClassId } = tariffData;

    const existingTariff = await Tariff.findOne({
      where: {
        cityId,
        carClassId,
        isActive: true,
      },
      transaction,
    });

    if (existingTariff) {
      throw new Error("Активный тариф для этих параметров уже существует");
    }

    let processedTariffData = { ...tariffData };

    if (
      processedTariffData.hourlyAdjustments &&
      !Array.isArray(processedTariffData.hourlyAdjustments)
    ) {
      processedTariffData.hourlyAdjustments = Object.entries(
        processedTariffData.hourlyAdjustments
      ).map(([hour, percent]) => ({ hour: parseInt(hour), percent }));
    }

    if (
      processedTariffData.monthlyAdjustments &&
      !Array.isArray(processedTariffData.monthlyAdjustments)
    ) {
      processedTariffData.monthlyAdjustments = Object.entries(
        processedTariffData.monthlyAdjustments
      ).map(([month, percent]) => ({ month: parseInt(month), percent }));
    }

    const tariff = await Tariff.create(
      {
        ...processedTariffData,
        createdBy: adminId,
      },
      { transaction }
    );

    await TariffHistory.create(
      {
        tariffId: tariff.id,
        cityId,
        carClassId,
        newValues: JSON.stringify(tariff.dataValues),
        changedBy: adminId,
        changeReason: "Создание нового тарифа",
      },
      { transaction }
    );

    const redisKey = getRedisKey(cityId, carClassId);
    await redis.del(redisKey);

    await transaction.commit();

    logger.info("Новый тариф создан", {
      tariffId: tariff.id,
      cityId,
      carClassId,
      correlationId,
      adminId,
    });

    return tariff;
  } catch (error) {
    await transaction.rollback();
    logger.error("Ошибка при создании тарифа", {
      error: error.message,
      tariffData,
      correlationId,
      adminId,
    });
    throw error;
  }
};

export const getTariffsFromService = async (cityId, carClassId) => {
  try {
    const redisKey = getRedisKey(cityId, carClassId);

    let tariffs = await redis.get(redisKey);
    if (tariffs) {
      logger.info("Тарифы загружены из Redis", { cityId, carClassId });
      return JSON.parse(tariffs);
    }

    tariffs = await Tariff.findAll({
      where: {
        cityId,
        carClassId,
        isActive: true,
      },
      order: [
        ["month", "ASC"],
        ["hour", "ASC"],
      ],
    });

    if (!tariffs.length) {
      throw new Error("Тарифы не найдены");
    }

    const processedTariffs = tariffs.map((tariff) => ({
      ...tariff.dataValues,
      effectivePrice: calculateEffectivePrice(tariff),
    }));

    await redis.set(redisKey, JSON.stringify(processedTariffs), { EX: 3600 });

    return processedTariffs;
  } catch (error) {
    logger.error("Ошибка при получении тарифов", {
      error: error.message,
      cityId,
      carClassId,
    });
    throw error;
  }
};

const calculateEffectivePrice = (tariff) => {
  const basePrice = tariff.baseFare;
  const seasonalMultiplier = tariff.seasonalMultiplier || 1.0;
  return basePrice * seasonalMultiplier;
};

export const calculateRideCost = async (
  cityId,
  carClassId,
  distance,
  duration
) => {
  try {
    const now = new Date();
    const hour = now.getHours();
    const month = now.getMonth() + 1;
    const tariffs = await getTariff(cityId);

    const tariff = tariffs.find((t) => t.carClassId === carClassId);
    if (!tariff) {
      throw new Error(`Тариф не найден для класса автомобиля ${carClassId}`);
    }

    let costPerKm = tariff.costPerKm;
    let costPerMinute = tariff.costPerMinute;

    if (hour >= 22 || hour < 6) {
      costPerKm *= 1 + tariff.nightCoefficient / 100;
      costPerMinute *= 1 + tariff.nightCoefficient / 100;
    }

    if (month >= 11 || month <= 2) {
      costPerKm *= 1 + tariff.monthlyCoefficient / 100;
      costPerMinute *= 1 + tariff.monthlyCoefficient / 100;
    }

    if (isHoliday(now)) {
      costPerKm *= 1 + tariff.holidayCoefficient / 100;
      costPerMinute *= 1 + tariff.holidayCoefficient / 100;
    }

    const distanceCost = distance * costPerKm;
    const timeCost = duration * costPerMinute;
    const totalCost = distanceCost + timeCost;

    logger.info("Стоимость поездки рассчитана", {
      cityId,
      carClassId,
      distance,
      duration,
      totalCost,
      distanceCost,
      timeCost,
    });

    return {
      totalCost,
      distanceCost,
      timeCost,
      costPerKm,
      costPerMinute,
    };
  } catch (error) {
    logger.error("Ошибка при расчете стоимости поездки", {
      error: error.message,
      cityId,
      carClassId,
      distance,
      duration,
    });
    throw error;
  }
};
