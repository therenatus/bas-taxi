import { Sequelize } from 'sequelize';
import logger from './logger.js';

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST || 'mysql',
        dialect: 'mysql',
        logging: (msg) => logger.debug(msg),
    }
);

export default sequelize;
