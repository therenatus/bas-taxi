import dotenv from 'dotenv';

dotenv.config();

export default {
    port: process.env.PORT || 4000,
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
    rabbitmq: {
        url: process.env.RABBITMQ_URL
    },
    redis: {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: process.env.REDIS_PORT || 6379
    }
};
