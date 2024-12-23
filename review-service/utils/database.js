import { Sequelize } from 'sequelize';
import logger from './logger.js';

const sequelize = new Sequelize('reviewdb', process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    logging: (msg) => logger.info(msg),
});

const connectDB = async () => {
    try {
        await sequelize.authenticate();
        logger.info('Connected to PostgreSQL database');
    } catch (error) {
        logger.error('Unable to connect to the database:', { error: error.message });
        process.exit(1);
    }
};

connectDB();

export default sequelize;
