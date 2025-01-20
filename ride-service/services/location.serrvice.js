import redisClient from '../utils/redis.js';
import logger from '../utils/logger.js';

const ACTIVE_DRIVERS_KEY = 'driver_locations';
const PARKING_DRIVERS_KEY = 'parking_driver_locations';

const addOrUpdateDriverLocation = async (key, driverId, latitude, longitude) => {
    if (!driverId || !latitude || !longitude) {
        throw new Error('Не переданы обязательные параметры: driverId, latitude, longitude');
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lon)) {
        throw new Error('Координаты должны быть числовыми');
    }

    await redisClient.geoAdd(key, { member: driverId.toString(), longitude: lon, latitude: lat });
    logger.info(`Местоположение водителя ${driverId} обновлено в ${key}: ${lat}, ${lon}`);
};

const findDriversInRadius = async (key, latitude, longitude, radius = 100, limit = 10) => {
    try {
        const drivers = await redisClient.sendCommand([
            'GEOSEARCH',
            key,
            'FROMLONLAT', longitude.toString(), latitude.toString(),
            'BYRADIUS', radius.toString(), 'km',
            'WITHDIST',
            'WITHCOORD',
            'COUNT', limit.toString(),
            'ASC'
        ]);

        console.log({ drivers });

        if (!drivers || !Array.isArray(drivers)) {
            throw new Error(`Не удалось получить данные из Redis для ключа ${key}`);
        }

        return drivers.map(([driverId, distance, coordinates]) => {
            const [lon, lat] = coordinates; // Извлекаем координаты
            return {
                driverId: parseInt(driverId, 10),
                distance: parseFloat(distance),
                coordinates: {
                    latitude: parseFloat(lat),
                    longitude: parseFloat(lon),
                }
            };
        });
    } catch (error) {
        logger.error(`Ошибка при поиске водителей в ${key}`, { error: error.message });
        return [];
    }
};

const removeDriverLocationByKey = async (key, driverId) => {
    try {
        await redisClient.zRem(key, driverId.toString());
        logger.info(`Местоположение водителя ${driverId} удалено из ${key}`);
    } catch (error) {
        logger.error(`Ошибка удаления местоположения водителя в ${key}`, { error: error.message });
        throw new Error('Не удалось удалить местоположение водителя');
    }
};

export const addDriverLocation = async (driverId, latitude, longitude) => {
    await addOrUpdateDriverLocation(ACTIVE_DRIVERS_KEY, driverId, latitude, longitude);
};

export const updateDriverLocation = async (driverId, latitude, longitude) => {
    await addOrUpdateDriverLocation(ACTIVE_DRIVERS_KEY, driverId, latitude, longitude);
};

export const removeDriverLocation = async (driverId) => {
    await removeDriverLocationByKey(ACTIVE_DRIVERS_KEY, driverId);
};

export const findNearbyDrivers = async (latitude, longitude, radius = 5, limit = 10) => {
    return await findDriversInRadius(ACTIVE_DRIVERS_KEY, latitude, longitude, radius, limit);
};

export const addParkedDriverLocation = async (driverId, latitude, longitude) => {
    await addOrUpdateDriverLocation(PARKING_DRIVERS_KEY, driverId, latitude, longitude);
};

export const updateDriverParkingLocation = async (driverId, latitude, longitude) => {
    await addOrUpdateDriverLocation(PARKING_DRIVERS_KEY, driverId, latitude, longitude);
};

export const removeParkedDriverLocation = async (driverId) => {
    await removeDriverLocationByKey(PARKING_DRIVERS_KEY, driverId);
};

export const findNearbyParkedDrivers = async (latitude, longitude, radius = 5, limit = 10) => {
    return await findDriversInRadius(PARKING_DRIVERS_KEY, latitude, longitude, radius, limit);
};
