import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import logger from "../utils/logger.js";

const API_GATEWAY_URL = process.env.API_GATEWAY_URL;

export const createTariff = async (req, res) => {
  const tariffData = req.body;
  const correlationId = req.headers["x-correlation-id"];
  const adminId = req.user.adminId;

  try {
    // Валидация обязательных полей
    const requiredFields = [
      "cityId",
      "carClassId",
      "baseFare",
      "costPerKm",
      "costPerMinute",
    ];
    for (const field of requiredFields) {
      if (!tariffData[field]) {
        throw new Error(`Отсутствует обязательное поле: ${field}`);
      }
    }

    // Добавляем дополнительные поля по умолчанию
    const enrichedTariffData = {
      ...tariffData,
      hourlyAdjustments: tariffData.hourlyAdjustments || {},
      monthlyAdjustments: tariffData.monthlyAdjustments || {},
      holidayAdjustments: tariffData.holidayAdjustments || [],
      isActive: true,
      createdBy: adminId,
    };

    // Используем правильный путь, соответствующий существующему API
    const response = await axios.post(
      `${API_GATEWAY_URL}/rides/tariffs`,
      enrichedTariffData,
      {
        headers: {
          Authorization: req.headers.authorization,
          "X-Correlation-ID": correlationId,
          "X-Admin-ID": adminId,
        },
      }
    );

    logger.info("Тариф успешно создан", {
      cityId: tariffData.cityId,
      carClassId: tariffData.carClassId,
      correlationId,
      adminId,
    });

    res.status(201).json({
      message: "Тариф успешно создан",
      data: response.data,
    });
  } catch (error) {
    logger.error("Ошибка при создании тарифа", {
      error: error.message,
      correlationId,
      adminId,
      tariffData,
      statusCode: error.response?.status,
      responseData: error.response?.data,
    });

    // Более детальная обработка ошибок
    if (error.response) {
      // Ошибка от API
      const status = error.response.status;
      const message = error.response.data?.error || error.message;

      switch (status) {
        case 409:
          return res.status(409).json({
            error: "Тариф с такими параметрами уже существует",
            details: message,
          });
        case 404:
          return res.status(404).json({
            error: "Сервис тарифов недоступен",
            details: "Не удалось подключиться к сервису тарифов",
          });
        case 400:
          return res.status(400).json({
            error: "Неверные параметры запроса",
            details: message,
          });
        default:
          return res.status(status).json({
            error: "Ошибка при создании тарифа",
            details: message,
          });
      }
    }

    // Ошибка сети или другая ошибка
    res.status(500).json({
      error: "Внутренняя ошибка сервера",
      details: error.message,
    });
  }
};

export const getTariffs = async (req, res) => {
  const { cityId } = req.params;
  const correlationId = req.headers["x-correlation-id"];

  try {
    const response = await axios.get(
      `${API_GATEWAY_URL}/rides/tariffs/${cityId}`,
      {
        headers: {
          Authorization: req.headers.authorization,
          "X-Correlation-ID": correlationId,
        },
      }
    );

    // Get tariffs from the response
    const tariffs = response.data.tariffs;

    logger.info("Получены тарифы", {
      cityId,
      totalTariffs: tariffs.length,
      correlationId,
    });

    res.json({
      tariffs,
      summary: response.data.summary || {
        totalTariffs: tariffs.length,
        cityId,
      },
    });
  } catch (error) {
    handleError(error, res, "Ошибка при получении тарифов");
  }
};

export const deleteTariff = async (req, res) => {
  const { id } = req.params;
  const correlationId = req.headers["x-correlation-id"];
  console.log("req user", req.user);
  const adminId = req.user.adminId;

  try {
    await axios.delete(`${API_GATEWAY_URL}/rides/tariffs/${id}`, {
      headers: {
        Authorization: req.headers.authorization,
        "X-Correlation-ID": correlationId,
        "X-Admin-ID": adminId,
      },
    });

    logger.info("Тариф успешно удален", {
      id,
      correlationId,
      adminId,
    });

    res.json({ message: "Тариф успешно удален" });
  } catch (error) {
    logger.error("Ошибка при удалении тарифа", {
      error: error.message,
      id,
      correlationId,
      adminId,
    });

    if (error.response?.status === 404) {
      return res.status(404).json({
        error: "Тариф не найден",
      });
    }

    res.status(500).json({
      error: "Ошибка при удалении тарифа",
      details: error.message,
    });
  }
};

export const updateHourlyAdjustment = async (req, res) => {
  const { cityId, carClassId, hour, percent, multiplier } = req.body;
  const correlationId = req.headers["x-correlation-id"];
  const adminId = req.user.adminId;

  try {
    const response = await axios.put(
      `${API_GATEWAY_URL}/rides/tariffs/hour`,
      { cityId, carClassId, hour, percent, multiplier },
      {
        headers: {
          Authorization: req.headers.authorization,
          "X-Correlation-ID": correlationId,
          "X-Admin-ID": adminId,
        },
      }
    );

    logger.info("Почасовой коэффициент обновлен", {
      cityId,
      carClassId,
      hour,
      multiplier,
      correlationId,
      adminId,
    });

    res.json(response.data);
  } catch (error) {
    handleError(error, res, "Ошибка при обновлении почасового коэффициента");
  }
};

export const updateMonthlyAdjustment = async (req, res) => {
  const { cityId, carClassId, month, percent, multiplier } = req.body;
  const correlationId = req.headers["x-correlation-id"];
  const adminId = req.user.adminId;

  try {
    const response = await axios.put(
      `${API_GATEWAY_URL}/rides/tariffs/month`,
      { cityId, carClassId, month, percent, multiplier },
      {
        headers: {
          Authorization: req.headers.authorization,
          "X-Correlation-ID": correlationId,
          "X-Admin-ID": adminId,
        },
      }
    );

    logger.info("Месячный коэффициент успешно обновлен", {
      cityId,
      carClassId,
      month,
      multiplier,
      correlationId,
      adminId,
    });

    res.json(response.data);
  } catch (error) {
    logger.error("Ошибка при обновлении месячного коэффициента", {
      error: error.message,
      cityId,
      carClassId,
      month,
      multiplier,
      correlationId,
      adminId,
    });

    if (error.response?.status === 404) {
      return res.status(404).json({
        error: "Тариф не найден",
      });
    }

    res.status(500).json({
      error: "Ошибка при обновлении месячного коэффициента",
      details: error.message,
    });
  }
};

export const updateSettings = async (req, res) => {
  const { cityId, carClassId, hour, month, updates } = req.body;
  const correlationId = req.headers["x-correlation-id"];
  const adminId = req.user.adminId;

  try {
    const message = await updateSettingsInService(
      {
        cityId,
        carClassId,
        hour,
        month,
        ...updates,
      },
      correlationId,
      adminId
    );

    logger.info("Настройки тарифа успешно обновлены", {
      cityId,
      carClassId,
      hour,
      month,
      correlationId,
      adminId,
    });

    res.json({
      message: "Настройки тарифа успешно обновлены",
      data: message,
    });
  } catch (error) {
    logger.error("Ошибка при обновлении настроек тарифа", {
      error: error.message,
      cityId,
      carClassId,
      hour,
      month,
      correlationId,
    });
    res.status(500).json({ error: "Ошибка при обновлении настроек тарифа" });
  }
};

export const addHoliday = async (req, res) => {
  const { cityId, carClassId, month, day, multiplier, name } = req.body;
  const correlationId = req.headers["x-correlation-id"];
  const adminId = req.user.adminId;

  try {
    const response = await axios.post(
      `${API_GATEWAY_URL}/rides/tariffs/holiday`,
      { cityId, carClassId, month, day, multiplier, name },
      {
        headers: {
          Authorization: req.headers.authorization,
          "X-Correlation-ID": correlationId,
          "X-Admin-ID": adminId,
        },
      }
    );

    logger.info("Праздничный день успешно добавлен", {
      cityId,
      carClassId,
      month,
      day,
      name,
      multiplier,
      correlationId,
      adminId,
    });

    res.status(201).json(response.data);
  } catch (error) {
    logger.error("Ошибка при добавлении праздничного дня", {
      error: error.message,
      cityId,
      carClassId,
      month,
      day,
      name,
      multiplier,
      correlationId,
      adminId,
    });

    if (error.response?.status === 404) {
      return res.status(404).json({
        error: "Тариф не найден",
      });
    }

    if (error.response?.status === 409) {
      return res.status(409).json({
        error: "Праздничный день с такими параметрами уже существует",
      });
    }

    res.status(500).json({
      error: "Ошибка при добавлении праздничного дня",
      details: error.message,
    });
  }
};

export const deleteHoliday = async (req, res) => {
  const { cityId, carClassId, month, day } = req.body;
  const correlationId = req.headers["x-correlation-id"];
  const adminId = req.user.adminId;

  try {
    const response = await axios.delete(
      `${API_GATEWAY_URL}/rides/tariffs/holiday`,
      {
        headers: {
          Authorization: req.headers.authorization,
          "X-Correlation-ID": correlationId,
          "X-Admin-ID": adminId,
        },
        data: { cityId, carClassId, month, day },
      }
    );

    logger.info("Праздничный день успешно удален", {
      cityId,
      carClassId,
      month,
      day,
      correlationId,
      adminId,
    });

    res.json(response.data);
  } catch (error) {
    logger.error("Ошибка при удалении праздничного дня", {
      error: error.message,
      cityId,
      carClassId,
      month,
      day,
      correlationId,
      adminId,
    });

    if (error.response?.status === 404) {
      return res.status(404).json({
        error: "Праздничный день не найден",
      });
    }

    res.status(500).json({
      error: "Ошибка при удалении праздничного дня",
      details: error.message,
    });
  }
};

// Улучшенная функция обработки ошибок
const handleError = (error, res, defaultMessage) => {
  const errorDetails = {
    message: error.message,
    status: error.response?.status,
    data: error.response?.data,
    path: error.config?.url,
  };

  logger.error(defaultMessage, errorDetails);

  if (error.response) {
    const status = error.response.status;
    const message = error.response.data?.error || error.message;

    switch (status) {
      case 404:
        return res.status(404).json({
          error: "Ресурс не найден",
          details: message,
        });
      case 400:
        return res.status(400).json({
          error: "Неверный запрос",
          details: message,
        });
      default:
        return res.status(status).json({
          error: defaultMessage,
          details: message,
        });
    }
  }

  res.status(500).json({
    error: "Внутренняя ошибка сервера",
    details: error.message,
  });
};

/**
 * Получает список всех городов
 * @param {Object} req - Express Request объект
 * @param {Object} res - Express Response объект
 */
export const getCities = async (req, res) => {
  try {
    const correlationId = req.correlationId || uuidv4();

    logger.info("Запрос на получение списка городов", {
      userId: req.user.id,
      correlationId,
    });

    const response = await axios.get(`${API_GATEWAY_URL}/rides/cities`, {
      headers: {
        Authorization: req.headers.authorization,
        "X-Correlation-ID": correlationId,
      },
    });

    logger.info("Получен список городов", {
      userId: req.user.id,
      correlationId,
      citiesCount: response.data.cities.length,
    });

    res.status(200).json(response.data);
  } catch (error) {
    console.log("error", error);
    logger.error("Ошибка при получении списка городов", {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      correlationId: req.correlationId,
      statusCode: error.response?.status,
      responseData: error.response?.data,
    });

    res.status(500).json({
      error: "Не удалось получить список городов",
      details: error.message,
      correlationId: req.correlationId,
    });
  }
};

/**
 * Получает список всех классов автомобилей
 * @param {Object} req - Express Request объект
 * @param {Object} res - Express Response объект
 */
export const getCarClasses = async (req, res) => {
  try {
    const correlationId = req.correlationId || uuidv4();

    logger.info("Запрос на получение списка классов автомобилей", {
      userId: req.user.id,
      correlationId,
    });

    const response = await axios.get(`${API_GATEWAY_URL}/rides/car-classes`, {
      headers: {
        Authorization: req.headers.authorization,
        "X-Correlation-ID": correlationId,
      },
    });

    logger.info("Получен список классов автомобилей", {
      userId: req.user.id,
      correlationId,
      carClassesCount: response.data.carClasses.length,
    });

    res.status(200).json(response.data);
  } catch (error) {
    logger.error("Ошибка при получении списка классов автомобилей", {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      correlationId: req.correlationId,
      statusCode: error.response?.status,
      responseData: error.response?.data,
    });

    res.status(500).json({
      error: "Не удалось получить список классов автомобилей",
      details: error.message,
      correlationId: req.correlationId,
    });
  }
};

export const createHourlyAdjustment = async (req, res) => {
  const { cityId, carClassId, hour, multiplier } = req.body;
  const correlationId = req.headers["x-correlation-id"] || uuidv4();
  const adminId = req.user.adminId;

  try {
    // Валидация входных данных
    if (
      !cityId ||
      !carClassId ||
      hour === undefined ||
      multiplier === undefined
    ) {
      return res.status(400).json({
        error:
          "Отсутствуют обязательные поля: cityId, carClassId, hour, multiplier",
      });
    }

    // Проверка диапазона часа
    if (hour < 0 || hour > 23) {
      return res.status(400).json({
        error: "Значение hour должно быть в диапазоне от 0 до 23",
      });
    }

    const response = await axios.post(
      `${API_GATEWAY_URL}/rides/tariffs/hourly-adjustment`,
      { cityId, carClassId, hour, multiplier },
      {
        headers: {
          Authorization: req.headers.authorization,
          "X-Correlation-ID": correlationId,
          "X-Admin-ID": adminId,
        },
      }
    );

    logger.info("Почасовой коэффициент успешно создан", {
      cityId,
      carClassId,
      hour,
      multiplier,
      correlationId,
      adminId,
    });

    res.status(201).json({
      message: "Почасовой коэффициент успешно создан",
      data: response.data,
    });
  } catch (error) {
    logger.error("Ошибка при создании почасового коэффициента", {
      error: error.message,
      cityId,
      carClassId,
      hour,
      multiplier,
      correlationId,
      adminId,
    });

    if (error.response?.status === 404) {
      return res.status(404).json({
        error: "Тариф не найден",
      });
    }

    res.status(500).json({
      error: "Ошибка при создании почасового коэффициента",
      details: error.message,
    });
  }
};
