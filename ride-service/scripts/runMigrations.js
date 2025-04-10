import dotenv from 'dotenv';
import sequelize from '../utils/sequelize.js';
import logger from '../utils/logger.js';
import { initModels } from '../models/index.js';
import { up } from '../migrations/20250410_setup_tariff_system.js';

dotenv.config();

const runMigrations = async () => {
    try {
        await sequelize.authenticate();
        logger.info('Успешное подключение к базе данных');

        // Инициализируем модели и их связи
        initModels();

        // Запускаем миграцию
        await up(sequelize.getQueryInterface());
        logger.info('Миграция успешно выполнена');

        // Проверяем данные
        const [cities] = await sequelize.query('SELECT * FROM cities');
        const [carClasses] = await sequelize.query('SELECT * FROM car_classes');

        logger.info('Текущие города:', { cities });
        logger.info('Текущие классы автомобилей:', { carClasses });

    } catch (error) {
        logger.error('Ошибка при выполнении миграции', {
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
};

runMigrations()
    .then(() => {
        logger.info('Миграция завершена успешно');
        process.exit(0);
    })
    .catch((error) => {
        logger.error('Ошибка при выполнении миграции', { error });
        process.exit(1);
    }); 