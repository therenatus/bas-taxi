import redisClient from '../utils/redis.js';
import logger from '../utils/logger.js';

const updateDriverLocation = async (driverId, latitude, longitude) => {
    await redisClient.geoAdd('drivers', {
        longitude: parseFloat(longitude),
        latitude: parseFloat(latitude),
        member: driverId.toString(),
    });
    logger.info('Местоположение водителя обновлено', { driverId, latitude, longitude });
};

const findNearestDrivers = async (latitude, longitude, radius = 5000) => {
    const drivers = await redisClient.geoSearch('drivers', {
        longitude: parseFloat(longitude),
        latitude: parseFloat(latitude),
        radius: parseFloat(radius),
        unit: 'm',
        WITHCOORD: true,
    });

    logger.info('Найдены ближайшие водители', { count: drivers.length });
    return drivers;
};

export default {
    updateDriverLocation,
    findNearestDrivers,
};
