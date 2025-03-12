import {ApplicationError} from "../exceptions/application.error.js";

export class RideIntegrationService {
    #rideRepository;
    #eventPublisher;

    constructor({ rideRepository, eventPublisher }) {
        this.#rideRepository = rideRepository;
        this.#eventPublisher = eventPublisher;
    }

    handleRideEvent = async (event) => {
        try {
            switch(event.type) {
                case 'ride_started':
                    return await this.#handleRideStart(event);
                case 'ride_completed':
                    return await this.#handleRideCompletion(event);
                default:
                    throw new Error('Unknown event type');
            }
        } catch (error) {
            throw new ApplicationError(
                `Ride event handling failed: ${error.message}`,
                'EVENT_HANDLING_ERROR'
            );
        }
    };

    #handleRideStart = async ({ rideId, driverId, passengerId }) => {
        const ride = await this.#rideRepository.create({
            id: rideId,
            driverId,
            passengerId,
            status: 'active'
        });

        await this.#eventPublisher.publish('ride_chat_ready', {
            rideId,
            participants: [driverId, passengerId]
        });

        return ride;
    };

    #handleRideCompletion = async ({ rideId }) => {
        await this.#rideRepository.update(rideId, { status: 'completed' });
        await this.#eventPublisher.publish('ride_chat_archived', { rideId });
    };
}