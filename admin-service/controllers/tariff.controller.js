import axios from 'axios';
import logger from '../utils/logger.js';
import { createTariffInService } from '../services/admin.service.js';

const API_GATEWAY_URL = process.env.API_GATEWAY_URL;

export const createTariff = async (req, res) => {
    const tariffData = req.body;
    const correlationId = req.headers['x-correlation-id'];
    const adminId = req.user.id;

    try {
        // Добавляем сезонный множитель по умолчанию, если не указан
        if (!tariffData.seasonalMultiplier) {
            tariffData.seasonalMultiplier = 1.0;
        }

        const message = await createTariffInService(tariffData, correlationId, adminId);
        
        logger.info('Тариф успешно создан', { 
            cityId: tariffData.cityId,
            carClassId: tariffData.carClassId,
            hour: tariffData.hour,
            month: tariffData.month,
            seasonalMultiplier: tariffData.seasonalMultiplier,
            correlationId,
            adminId
        });
        
        res.status(201).json({ 
            message: 'Тариф успешно создан',
            data: message
        });
    } catch (error) {
        logger.error('Ошибка при создании тарифа', { 
            error: error.message,
            correlationId,
            adminId,
            tariffData
        });
        
        // Обработка специфических ошибок
        if (error.message.includes('уже существует')) {
            return res.status(409).json({ 
                error: 'Тариф с такими параметрами уже существует',
                details: error.message
            });
        }
        
        res.status(500).json({ 
            error: 'Ошибка при создании тарифа',
            details: error.message
        });
    }
};

export const getTariffs = async (req, res) => {
    const { cityId, carClassId } = req.params;
    const correlationId = req.headers['x-correlation-id'];

    try {
        const response = await axios.get(
            `${API_GATEWAY_URL}/rides/tariffs/${cityId}/${carClassId}`,
            {
                headers: {
                    Authorization: req.headers.authorization,
                    'X-Correlation-ID': correlationId
                }
            }
        );

        // Группируем тарифы по месяцам для удобства
        const groupedTariffs = response.data.reduce((acc, tariff) => {
            const month = tariff.month;
            if (!acc[month]) {
                acc[month] = [];
            }
            acc[month].push({
                ...tariff,
                effectivePrice: (tariff.baseFare * (tariff.seasonalMultiplier || 1.0)).toFixed(2)
            });
            return acc;
        }, {});

        logger.info('Получены тарифы', { 
            cityId, 
            carClassId,
            monthsCount: Object.keys(groupedTariffs).length,
            totalTariffs: response.data.length,
            correlationId 
        });

        res.json({
            tariffs: groupedTariffs,
            summary: {
                totalTariffs: response.data.length,
                monthsCount: Object.keys(groupedTariffs).length,
                cityId,
                carClassId
            }
        });
    } catch (error) {
        logger.error('Ошибка при получении тарифов', { 
            error: error.message,
            cityId,
            carClassId,
            correlationId 
        });
        
        if (error.response?.status === 404) {
            return res.status(404).json({ 
                error: 'Тарифы не найдены для указанных параметров'
            });
        }
        
        res.status(500).json({ 
            error: 'Ошибка при получении тарифов',
            details: error.message
        });
    }
};

export const deleteTariff = async (req, res) => {
    const { id } = req.params;
    const correlationId = req.headers['x-correlation-id'];
    const adminId = req.user.id;

    try {
        await axios.delete(
            `${API_GATEWAY_URL}/rides/tariffs/${id}`,
            {
                headers: {
                    Authorization: req.headers.authorization,
                    'X-Correlation-ID': correlationId,
                    'X-Admin-ID': adminId
                }
            }
        );

        logger.info('Тариф успешно удален', { 
            id,
            correlationId,
            adminId
        });

        res.json({ message: 'Тариф успешно удален' });
    } catch (error) {
        logger.error('Ошибка при удалении тарифа', { 
            error: error.message,
            id,
            correlationId,
            adminId
        });

        if (error.response?.status === 404) {
            return res.status(404).json({ 
                error: 'Тариф не найден'
            });
        }

        res.status(500).json({ 
            error: 'Ошибка при удалении тарифа',
            details: error.message
        });
    }
};

export const updateHourlyAdjustment = async (req, res) => {
    const { cityId, carClassId, hour, multiplier } = req.body;
    const correlationId = req.headers['x-correlation-id'];
    const adminId = req.user.id;

    try {
        const response = await axios.put(
            `${API_GATEWAY_URL}/rides/tariffs/hour`,
            { cityId, carClassId, hour, multiplier },
            {
                headers: {
                    Authorization: req.headers.authorization,
                    'X-Correlation-ID': correlationId,
                    'X-Admin-ID': adminId
                }
            }
        );

        logger.info('Почасовой коэффициент успешно обновлен', { 
            cityId, 
            carClassId,
            hour,
            multiplier,
            correlationId,
            adminId
        });

        res.json(response.data);
    } catch (error) {
        logger.error('Ошибка при обновлении почасового коэффициента', { 
            error: error.message,
            cityId,
            carClassId,
            hour,
            multiplier,
            correlationId,
            adminId
        });

        if (error.response?.status === 404) {
            return res.status(404).json({ 
                error: 'Тариф не найден'
            });
        }

        res.status(500).json({ 
            error: 'Ошибка при обновлении почасового коэффициента',
            details: error.message
        });
    }
};

export const updateMonthlyAdjustment = async (req, res) => {
    const { cityId, carClassId, month, multiplier } = req.body;
    const correlationId = req.headers['x-correlation-id'];
    const adminId = req.user.id;

    try {
        const response = await axios.put(
            `${API_GATEWAY_URL}/rides/tariffs/month`,
            { cityId, carClassId, month, multiplier },
            {
                headers: {
                    Authorization: req.headers.authorization,
                    'X-Correlation-ID': correlationId,
                    'X-Admin-ID': adminId
                }
            }
        );

        logger.info('Месячный коэффициент успешно обновлен', { 
            cityId, 
            carClassId,
            month,
            multiplier,
            correlationId,
            adminId
        });

        res.json(response.data);
    } catch (error) {
        logger.error('Ошибка при обновлении месячного коэффициента', { 
            error: error.message,
            cityId,
            carClassId,
            month,
            multiplier,
            correlationId,
            adminId
        });

        if (error.response?.status === 404) {
            return res.status(404).json({ 
                error: 'Тариф не найден'
            });
        }

        res.status(500).json({ 
            error: 'Ошибка при обновлении месячного коэффициента',
            details: error.message
        });
    }
};

export const addHoliday = async (req, res) => {
    const { cityId, carClassId, month, day, multiplier, name } = req.body;
    const correlationId = req.headers['x-correlation-id'];
    const adminId = req.user.id;

    try {
        const response = await axios.post(
            `${API_GATEWAY_URL}/rides/tariffs/holiday`,
            { cityId, carClassId, month, day, multiplier, name },
            {
                headers: {
                    Authorization: req.headers.authorization,
                    'X-Correlation-ID': correlationId,
                    'X-Admin-ID': adminId
                }
            }
        );

        logger.info('Праздничный день успешно добавлен', { 
            cityId, 
            carClassId,
            month,
            day,
            name,
            multiplier,
            correlationId,
            adminId
        });

        res.status(201).json(response.data);
    } catch (error) {
        logger.error('Ошибка при добавлении праздничного дня', { 
            error: error.message,
            cityId,
            carClassId,
            month,
            day,
            name,
            multiplier,
            correlationId,
            adminId
        });

        if (error.response?.status === 404) {
            return res.status(404).json({ 
                error: 'Тариф не найден'
            });
        }

        if (error.response?.status === 409) {
            return res.status(409).json({ 
                error: 'Праздничный день с такими параметрами уже существует'
            });
        }

        res.status(500).json({ 
            error: 'Ошибка при добавлении праздничного дня',
            details: error.message
        });
    }
};

export const deleteHoliday = async (req, res) => {
    const { cityId, carClassId, month, day } = req.body;
    const correlationId = req.headers['x-correlation-id'];
    const adminId = req.user.id;

    try {
        const response = await axios.delete(
            `${API_GATEWAY_URL}/rides/tariffs/holiday`,
            {
                headers: {
                    Authorization: req.headers.authorization,
                    'X-Correlation-ID': correlationId,
                    'X-Admin-ID': adminId
                },
                data: { cityId, carClassId, month, day }
            }
        );

        logger.info('Праздничный день успешно удален', { 
            cityId, 
            carClassId,
            month,
            day,
            correlationId,
            adminId
        });

        res.json(response.data);
    } catch (error) {
        logger.error('Ошибка при удалении праздничного дня', { 
            error: error.message,
            cityId,
            carClassId,
            month,
            day,
            correlationId,
            adminId
        });

        if (error.response?.status === 404) {
            return res.status(404).json({ 
                error: 'Праздничный день не найден'
            });
        }

        res.status(500).json({ 
            error: 'Ошибка при удалении праздничного дня',
            details: error.message
        });
    }
}; 