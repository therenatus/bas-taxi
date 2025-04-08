import sequelize from './sequelize.js';
import logger from './logger.js';
import { initModels } from '../models/index.js';

export const connectDB = async () => {
    try {
        await sequelize.authenticate();
        logger.info('Подключение к базе данных успешно');

        initModels();

        await sequelize.sync({ force: true });
        logger.info('Таблицы синхронизированы');
    } catch (error) {
        logger.error('Ошибка подключения к базе данных', { error: error.message });
        process.exit(1);
    }
};
