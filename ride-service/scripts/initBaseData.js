import dotenv from 'dotenv';
import sequelize from '../utils/sequelize.js';
import logger from '../utils/logger.js';
import {CarClass} from "../models/index.js";

dotenv.config();

const initBaseData = async () => {
    try {
        await sequelize.authenticate();
        logger.info('Успешное подключение к базе данных');

        // Проверяем существование записей
        const [existingClasses] = await sequelize.query(
          'SELECT id, name FROM car_classes'
        );

        if (existingClasses.length === 0) {
            // Используем прямой SQL для вставки данных
            await sequelize.query(`
                INSERT INTO car_classes (id, name) VALUES 
                (1, 'Эконом'),
                (2, 'Комфорт'),
                (3, 'Бизнес'),
                (4, 'Премиум')
                ON DUPLICATE KEY UPDATE name = VALUES(name)
            `);

            logger.info('Базовые классы автомобилей созданы');
        } else {
            logger.info('Базовые классы автомобилей уже существуют', {
                count: existingClasses.length,
                classes: existingClasses
            });
        }

        // Проверяем, что данные действительно созданы
        const [classes] = await sequelize.query(
          'SELECT id, name FROM car_classes'
        );
        logger.info('Текущие классы автомобилей:', { classes });

    } catch (error) {
        logger.error('Ошибка при инициализации базовых данных', {
            error: error.message,
            stack: error.stack
        });
        throw error;
    } finally {
        await sequelize.close();
    }
};

// Запускаем инициализацию
initBaseData()
  .then(() => {
      logger.info('Инициализация базовых данных завершена');
      process.exit(0);
  })
  .catch((error) => {
      logger.error('Ошибка при инициализации', {
          error: error.message,
          stack: error.stack
      });
      process.exit(1);
  });