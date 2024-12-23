import locationService from '../services/location.service.js';
import logger from '../utils/logger.js';

const socketHandler = (io, socket) => {
    socket.on('driverLocationUpdate', async (data) => {
        const { driverId, latitude, longitude } = data;

        await locationService.updateDriverLocation(driverId, latitude, longitude);

        io.emit('driverLocationUpdate', { driverId, latitude, longitude });
    });

    socket.on('passengerLocationUpdate', (data) => {
        const { passengerId, latitude, longitude } = data;
        io.emit('passengerLocationUpdate', { passengerId, latitude, longitude });
    });

    socket.on('disconnect', () => {
        logger.info('Клиент отключился', { socketId: socket.id });
    });
};

export default socketHandler;
