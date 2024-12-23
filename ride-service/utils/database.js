import { Sequelize } from 'sequelize';
import logger from './logger.js';

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD, {
    host: process.env.DB_HOST || 'mysql',
    dialect: 'mysql',
    logging: (msg) => logger.debug(msg),
});

const connectDB = async () => {
    try {
        await sequelize.authenticate();
        logger.info('Подключение к базе данных успешно');

        await sequelize.sync({ alter: true });
        logger.info('Таблицы синхронизированы');
    } catch (error) {
        logger.error('Ошибка подключения к базе данных', { error: error.message });
        process.exit(1);
    }
};

connectDB();

export default sequelize;
