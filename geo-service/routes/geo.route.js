import express from 'express';
import {
    geocodeAddress,
    reverseGeocode,
    getDistanceAndDuration,
    getDirections,
    findNearestDrivers,
    updateDriverLocation, getCityByCoordinates,
} from '../controllers/geo.controller.js';

const router = express.Router();

router.post('/geocode', geocodeAddress);
router.post('/get-city', getCityByCoordinates)
router.get('/reverse-geocode', reverseGeocode);
router.post('/distance', getDistanceAndDuration);
router.post('/directions', getDirections);
router.get('/nearest-drivers', findNearestDrivers);
router.post('/update-location', updateDriverLocation);

export default router;
