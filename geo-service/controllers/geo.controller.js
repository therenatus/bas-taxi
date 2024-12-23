import googleMapsService from '../services/map.service.js';
import locationService from '../services/location.service.js';
import logger from '../utils/logger.js';

export const geocodeAddress = async (req, res) => {
    try {
        const { address } = req.body;

        if (!address) {
            return res.status(400).json({ error: 'Параметр "address" обязателен' });
        }

        const location = await googleMapsService.geocodeAddress(address);

        res.json(location);
    } catch (error) {
        logger.error('Ошибка в geocodeAddress', { error: error.message });
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

export const reverseGeocode = async (req, res) => {
    try {
        const { latitude, longitude } = req.query;

        if (!latitude || !longitude) {
            return res.status(400).json({ error: 'Параметры "latitude" и "longitude" обязательны' });
        }

        const address = await googleMapsService.reverseGeocode(latitude, longitude);

        res.json({ address });
    } catch (error) {
        logger.error('Ошибка в reverseGeocode', { error: error.message });
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

export const getCityByCoordinates = async (req, res) => {
    try {
        const { latitude, longitude } = req.body;

        if (!latitude || !longitude) {
            return res.status(400).json({ error: 'Параметр "address" обязателен' });
        }

        const location = await googleMapsService.getCityByCoordinates(latitude, longitude);

        res.json(location);
    } catch (error) {
        logger.error('Ошибка в geocodeAddress', { error: error.message });
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

export const getDistanceAndDuration = async (req, res) => {
    try {
        const { origin, destination } = req.body;

        if (!origin || !destination) {
            return res.status(400).json({ error: 'Параметры "origin" и "destination" обязательны' });
        }

        const result = await googleMapsService.getDistanceAndDuration(origin, destination);

        res.json(result);
    } catch (error) {
        logger.error('Ошибка в getDistanceAndDuration', { error: error.message });
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

export const getDirections = async (req, res) => {
    try {
        const { origin, destination } = req.body;

        if (!origin || !destination) {
            return res.status(400).json({ error: 'Параметры "origin" и "destination" обязательны' });
        }

        const directions = await googleMapsService.getDirections(origin, destination);

        res.json({ directions });
    } catch (error) {
        logger.error('Ошибка в getDirections', { error: error.message });
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

export const findNearestDrivers = async (req, res) => {
    try {
        const { latitude, longitude, radius } = req.query;

        if (!latitude || !longitude) {
            return res.status(400).json({ error: 'Параметры "latitude" и "longitude" обязательны' });
        }

        const drivers = await locationService.findNearestDrivers(latitude, longitude, radius);

        res.json({ drivers });
    } catch (error) {
        logger.error('Ошибка в findNearestDrivers', { error: error.message });
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

export const updateDriverLocation = async (req, res) => {
    try {
        const { driverId, latitude, longitude } = req.body;

        if (!driverId || !latitude || !longitude) {
            return res.status(400).json({ error: 'Параметры "driverId", "latitude" и "longitude" обязательны' });
        }

        await locationService.updateDriverLocation(driverId, latitude, longitude);

        res.json({ message: 'Местоположение водителя обновлено' });
    } catch (error) {
        logger.error('Ошибка в updateDriverLocation', { error: error.message });
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};
