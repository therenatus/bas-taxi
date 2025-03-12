import dotenv from 'dotenv';

dotenv.config();

const config = {
    env: process.env.NODE_ENV || 'development',
    databaseUrl: process.env.DATABASE_URL,
    port: process.env.PORT || 3000,
    jwtSecret: process.env.JWT_SECRET || 'your-secret',
};

export default config;
