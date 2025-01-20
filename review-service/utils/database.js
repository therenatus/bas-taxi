import { Sequelize } from 'sequelize';
import mysql from 'mysql2/promise';
import logger from './logger.js';

const DB_NAME = 'reviewdb';
const sequelize = new Sequelize(DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    logging: (msg) => logger.info(msg),
});

const createDatabaseIfNotExists = async () => {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
        });

        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
        await connection.end();

        logger.info(`База данных ${DB_NAME} проверена или создана`);
    } catch (error) {
        logger.error('Ошибка при создании базы данных:', { error: error.message });
        throw error;
    }
};

const connectDB = async () => {
    try {
        await createDatabaseIfNotExists(); // Создаём базу, если не существует
        await sequelize.authenticate(); // Подключаемся к базе данных
        logger.info('Подключение к базе данных успешно установлено');
    } catch (error) {
        logger.error('Ошибка подключения к базе данных:', { error: error.message });
        throw error;
    }
};

export { sequelize as default, connectDB };
