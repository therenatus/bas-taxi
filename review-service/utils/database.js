import mysql from "mysql2/promise";
import { Sequelize } from "sequelize";
import logger from "./logger.js";

const DB_NAME = "reviewdb";
const sequelize = new Sequelize(
  DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: "mysql",
    logging: (msg) => logger.info(msg),
  }
);

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
    logger.error("Ошибка при создании базы данных:", { error: error.message });
    throw error;
  }
};

const connectDB = async () => {
  try {
    await createDatabaseIfNotExists();
    await sequelize.authenticate();
    logger.info("Подключение к базе данных успешно установлено");
  } catch (error) {
    logger.error("Ошибка подключения к базе данных:", { error: error.message });
    throw error;
  }
};

export { connectDB, sequelize as default };
