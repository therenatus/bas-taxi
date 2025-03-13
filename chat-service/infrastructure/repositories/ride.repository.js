// src/infrastructure/repositories/RideRepository.js
import { ApplicationError } from '../../application/exceptions/application.error.js';
import { RideEntity } from '../../domain/entities/ride.entity.js';

export class RideRepository {
    #httpClient;

    constructor(httpClient) {
        this.#httpClient = httpClient;
    }

    async findById(rideId) {
        try {
            const response = await this.#httpClient.get(`/rides/${rideId}`);
            return RideEntity.createFromRideServiceDTO(response.data);
        } catch (error) {
            if (error.response?.status === 404) {
                throw new ApplicationError('Ride not found', 'RIDE_NOT_FOUND', 404);
            }
            throw new ApplicationError(
              'Failed to fetch ride data',
              'RIDE_SERVICE_ERROR',
              503
            );
        }
    }

    async findActiveByDriver(driverId) {
        try {
            const response = await this.#httpClient.get(
              `/rides?driverId=${driverId}&status=active`
            );
            return response.data.map(RideEntity.createFromRideServiceDTO);
        } catch (error) {
            throw new ApplicationError(
              'Failed to fetch active rides',
              'RIDE_SERVICE_ERROR',
              503
            );
        }
    }

    async subscribeToEvents(handler) {
        const eventSource = new EventSource(`${this.#httpClient.defaults.baseURL}/events`);

        eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data);
            handler(data);
        };

        eventSource.onerror = (error) => {
            console.error('Ride service event error:', error);
        };
    }
}