import dotenv from 'dotenv';

dotenv.config();

const config = {
    port: process.env.PORT || 5000,
    rabbitmq: {
        url: process.env.RABBITMQ_URL
    },
    redis: {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: process.env.REDIS_PORT || 6379
    },
    swagger: {
        path: process.env.SWAGGER_PATH || '/api-docs'
    }
};

export default config;
