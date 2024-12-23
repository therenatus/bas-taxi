import axios from 'axios';
import logger from '../utils/logger.js';

const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

const geocodeAddress = async (address) => {
    const url = `https://maps.googleapis.com/maps/api/geocode/json`;
    const params = {
        address,
        key: googleMapsApiKey,
    };

    const response = await axios.get(url, { params });
    const data = response.data;

    if (data.status !== 'OK') {
        logger.error('Ошибка Geocode API', { status: data.status, error: data.error_message });
        throw new Error('Не удалось геокодировать адрес');
    }

    const location = data.results[0].geometry.location;

    return location;
};

const reverseGeocode = async (latitude, longitude) => {
    const url = `https://maps.googleapis.com/maps/api/geocode/json`;
    const params = {
        latlng: `${latitude},${longitude}`,
        key: googleMapsApiKey,
    };

    const response = await axios.get(url, { params });
    const data = response.data;

    if (data.status !== 'OK') {
        logger.error('Ошибка Reverse Geocode API', { status: data.status, error: data.error_message });
        throw new Error('Не удалось выполнить обратное геокодирование координат');
    }

    const address = data.results[0].formatted_address;

    return address;
};

const getCityByCoordinates = async (latitude, longitude) => {
    const url = 'https://maps.googleapis.com/maps/api/geocode/json';
    const params = {
        latlng: `${latitude},${longitude}`,
        key: googleMapsApiKey,
        language: 'ru',
    };

    try {
        const response = await axios.get(url, { params });
        const data = response.data;

        if (data.status !== 'OK') {
            throw new Error(`Ошибка Geocoding API: ${data.error_message || data.status}`);
        }

        const addressComponents = data.results[0]?.address_components;

        const cityComponent = addressComponents.find((component) =>
            component.types.includes('locality')
        );

        if (!cityComponent) {
            throw new Error('Город не найден в координатах');
        }

        return cityComponent.long_name;
    } catch (error) {
        console.error('Ошибка при запросе города по координатам:', error.message);
        throw error;
    }
};

const getDistanceAndDuration = async (origin, destination) => {
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json`;
    const params = {
        origins: origin,
        destinations: destination,
        key: googleMapsApiKey,
    };

    const response = await axios.get(url, { params });
    const data = response.data;

    if (data.status !== 'OK') {
        logger.error('Ошибка Distance Matrix API', { status: data.status, error: data.error_message });
        throw new Error('Не удалось получить расстояние и время');
    }

    const element = data.rows[0].elements[0];

    if (element.status !== 'OK') {
        logger.error('Ошибка элемента Distance Matrix', { status: element.status });
        throw new Error('Невозможно вычислить расстояние и время');
    }

    return {
        distance: element.distance.value,
        duration: element.duration.value,
    };
};

const getDirections = async (origin, destination) => {
    const url = `https://maps.googleapis.com/maps/api/directions/json`;
    const params = {
        origin,
        destination,
        key: googleMapsApiKey,
    };

    const response = await axios.get(url, { params });
    const data = response.data;

    if (data.status !== 'OK') {
        logger.error('Ошибка Directions API', { status: data.status, error: data.error_message });
        throw new Error('Не удалось получить маршрут');
    }

    return data.routes[0];
};

export default {
    geocodeAddress,
    reverseGeocode,
    getDistanceAndDuration,
    getDirections,
    getCityByCoordinates
};
