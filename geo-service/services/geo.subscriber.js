import { getChannel } from '../utils/rabbitmq.js';
import logger from '../utils/logger.js';
import googleMapsService from './map.service.js';
import locationService from './location.service.js';
import { publishGeoEvent } from './event.publisher.js';

export const subscribeToRideRequests = async () => {
    const channel = getChannel();
    const exchangeName = 'ride_requests';
    await channel.assertExchange(exchangeName, 'fanout', { durable: true });

    const q = await channel.assertQueue('', { exclusive: true });
    await channel.bindQueue(q.queue, exchangeName, '');

    channel.consume(q.queue, async (msg) => {
        if (msg.content) {
            const message = JSON.parse(msg.content.toString());
            const { event, data } = message;

            logger.info('Получен запрос на поездку', { event });

            if (event === 'ride_requested') {
                try {
                    const originLocation = await googleMapsService.geocodeAddress(data.origin);
                    const destinationLocation = await googleMapsService.geocodeAddress(data.destination);

                    const distanceData = await googleMapsService.getDistanceAndDuration(
                        `${originLocation.lat},${originLocation.lng}`,
                        `${destinationLocation.lat},${destinationLocation.lng}`
                    );

                    const nearbyDrivers = await locationService.findNearestDrivers(originLocation.lat, originLocation.lng);

                    await publishGeoEvent('ride_geo_data', {
                        rideId: data.rideId,
                        originLocation,
                        destinationLocation,
                        distanceData,
                        nearbyDrivers,
                    });
                } catch (error) {
                    logger.error('Ошибка при обработке запроса на поездку', { error: error.message });
                }
            }
        }
    }, { noAck: true });

    logger.info('Подписка на exchange ride_requests установлена');
};
