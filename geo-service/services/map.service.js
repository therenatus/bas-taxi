import axios from 'axios';
import Redis from 'ioredis';
import logger from '../utils/logger.js';

const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const geocodeAddress = async (address) => {
    const url = 'https://maps.googleapis.com/maps/api/geocode/json';
    const cacheKey = `geocode:${address}`;
    try {
        // Проверка кэша
        const cached = await redis.get(cacheKey);
        if (cached) {
            logger.info(`Cache hit: ${cacheKey}`);
            return JSON.parse(cached);
        }

        const params = {
            address,
            key: googleMapsApiKey,
        };

        const response = await axios.get(url, { params });
        const data = response.data;

        if (data.status !== 'OK') {
            logger.error('Geocode API error', { status: data.status, error: data.error_message });
            throw new Error(`Geocode failed: ${data.error_message || data.status}`);
        }

        const location = data.results[0].geometry.location;

        // Кэширование
        await redis.set(cacheKey, JSON.stringify(location), 'EX', 86400); // 24 часа
        logger.info(`Cached geocode: ${cacheKey}`);

        return location;
    } catch (error) {
        logger.error('Geocode request error', { error: error.message });
        throw error;
    }
};

const reverseGeocode = async (latitude, longitude) => {
    const url = 'https://maps.googleapis.com/maps/api/geocode/json';
    const cacheKey = `reverse-geocode:${latitude},${longitude}`;
    try {
        // Проверка кэша
        const cached = await redis.get(cacheKey);
        if (cached) {
            logger.info(`Cache hit: ${cacheKey}`);
            return JSON.parse(cached);
        }

        const params = {
            latlng: `${latitude},${longitude}`,
            key: googleMapsApiKey,
            language: 'ru', // Сохранён русский язык
    };

        const response = await axios.get(url, { params });
        const data = response.data;

        if (data.status !== 'OK') {
            logger.error('Reverse Geocode API error', { status: data.status, error: data.error_message });
            throw new Error(`Reverse Geocode failed: ${data.error_message || data.status}`);
        }

        const address = data.results[0].formatted_address;

        // Кэширование
        await redis.set(cacheKey, JSON.stringify(address), 'EX', 86400); // 24 часа
        logger.info(`Cached reverse-geocode: ${cacheKey}`);

        return address;
    } catch (error) {
        logger.error('Reverse Geocode request error', { error: error.message });
        throw error;
    }
};


const getCityByCoordinates = async (latitude, longitude) => {
    const url = 'https://maps.googleapis.com/maps/api/geocode/json';
    const cacheKey = `city:${latitude},${longitude}`;
    try {
        // Проверка кэша
        const cached = await redis.get(cacheKey);
        if (cached) {
            logger.info(`Cache hit: ${cacheKey}`);
            return JSON.parse(cached);
        }

        const params = {
            latlng: `${latitude},${longitude}`,
            key: googleMapsApiKey,
            language: 'ru', // Сохранён русский язык
    };

        const response = await axios.get(url, { params });
        const data = response.data;

        if (data.status !== 'OK') {
            logger.error('Geocoding API error', { status: data.status, error: data.error_message });
            throw new Error(`Geocoding failed: ${data.error_message || data.status}`);
        }

        if (!data.results || data.results.length === 0) {
            logger.error('No results for coordinates', { latitude, longitude });
            throw new Error('No results found for coordinates');
        }

        const addressComponents = data.results[0].address_components;
        const countryComponent = addressComponents.find((component) =>
            component.types.includes('country')
        );

        if (!countryComponent) {
            logger.error('Country not found', { latitude, longitude });
            throw new Error('Country not found in coordinates');
        }

        const result = countryComponent.long_name;

        // Кэширование
        await redis.set(cacheKey, JSON.stringify(result), 'EX', 86400); // 24 часа
        logger.info(`Cached city: ${cacheKey}`);
        return result;
    } catch (error) {
        logger.error('City by coordinates error', { error: error.message, latitude, longitude });
        throw error;
    }
};

// const getCityByCoordinates = async (latitude, longitude) => {
//     const url = 'https://maps.googleapis.com/maps/api/geocode/json';
//     const params = {
//         latlng: `${latitude},${longitude}`,
//         key: googleMapsApiKey,
//         language: 'ru',
//     };
//
//     try {
//         const response = await axios.get(url, { params });
//         const data = response.data;
//
//         if (data.status !== 'OK') {
//             throw new Error(`Ошибка Geocoding API: ${data.error_message || data.status}`);
//         }
//
//         if (!data.results || data.results.length === 0) {
//             throw new Error('Нет результатов для заданных координат.');
//         }
//
//         const addressComponents = data.results[0]?.address_components;
//         console.log({ addressComponents });
//
//         // const cityComponent = addressComponents.find((component) =>
//         //     component.types.includes('locality')
//         // );
//
//         const cityComponent = addressComponents.find((component) =>
//             component.types.includes('administrative_area_level_1')
//         );
//         console.log({ cityComponent });
//         console.log({ cityComponentLong: cityComponent.long_name });
//         if (!cityComponent) {
//             throw new Error('Город не найден в координатах');
//         }
//
//         return cityComponent.long_name;
//     } catch (error) {
//         console.error('Ошибка при запросе города по координатам:', error.message);
//         throw error;
//     }
// };

const getDistanceAndDuration = async (origin, destination) => {
    const url = 'https://maps.googleapis.com/maps/api/distancematrix/json';
    const cacheKey = `distance:${origin}:${destination}`;
    try {
        // Проверка кэша
        const cached = await redis.get(cacheKey);
        if (cached) {
            logger.info(`Cache hit: ${cacheKey}`);
            return JSON.parse(cached);
        }

        const params = {
            origins: origin,
            destinations: destination,
            key: googleMapsApiKey,
            mode: 'driving',
            departure_time: 'now', // Учёт трафика
            traffic_model: 'best_guess',
        };

        const response = await axios.get(url, { params });
        const data = response.data;

        if (data.status !== 'OK') {
            logger.error('Distance Matrix API error', { status: data.status, error: data.error_message });
            throw new Error(`Distance Matrix failed: ${data.error_message || data.status}`);
        }

        const element = data.rows[0].elements[0];

        if (element.status !== 'OK') {
            logger.error('Distance Matrix element error', { status: element.status });
            throw new Error('Cannot compute distance and duration');
        }

        const result = {
            distance: element.distance.value,
            duration: element.duration_in_traffic ? element.duration_in_traffic.value : element.duration.value,
        };

        // Кэширование
        await redis.set(cacheKey, JSON.stringify(result), 'EX', 3600); // 1 час
        logger.info(`Cached distance: ${cacheKey}`);

        return result;
    } catch (error) {
        logger.error('Distance Matrix request error', { error: error.message });
        throw error;
    }
};


const getDirections = async (origin, destination) => {
    const url = 'https://maps.googleapis.com/maps/api/directions/json';
    const cacheKey = `directions:${origin}:${destination}`;
    try {
        // Проверка кэша
        const cached = await redis.get(cacheKey);
        if (cached) {
            logger.info(`Cache hit: ${cacheKey}`);
            return JSON.parse(cached);
        }

        const params = {
            origin,
            destination,
            key: googleMapsApiKey,
            mode: 'driving',
            departure_time: 'now', // Учёт трафика
            traffic_model: 'best_guess',
        };

        const response = await axios.get(url, { params });
        const data = response.data;

        if (data.status !== 'OK') {
            logger.error('Directions API error', { status: data.status, error: data.error_message });
            throw new Error(`Directions failed: ${data.error_message || data.status}`);
        }

        const route = data.routes[0];

        // Кэширование
        await redis.set(cacheKey, JSON.stringify(route), 'EX', 3600); // 1 час
        logger.info(`Cached directions: ${cacheKey}`);

        return route;
    } catch (error) {
        logger.error('Directions request error', { error: error.message });
        throw error;
    }
};

export default {
    geocodeAddress,
    reverseGeocode,
    getDistanceAndDuration,
    getDirections,
    getCityByCoordinates,
};
