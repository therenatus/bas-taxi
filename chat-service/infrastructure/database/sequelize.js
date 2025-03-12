// src/infrastructure/database/sequelize.js
import { Sequelize } from 'sequelize';
import config from '../config/env.js';
import logger from '../config/logger.js';
import initModels from './model/index.js';
import initAssociations from './relations.js';

class Database {
    #sequelize;
    #models;

    constructor() {
        this.#sequelize = new Sequelize(config.databaseUrl, {
            logging: config.env === 'development' ? logger.info : false,
            dialectOptions: {
                ssl: config.env === 'production' && {
                    require: true,
                    rejectUnauthorized: false
                }
            },
            pool: {
                max: 10,
                min: 2,
                acquire: 30000,
                idle: 10000
            },
            define: {
                timestamps: true,
                paranoid: true,
                underscored: true,
                freezeTableName: true
            }
        });

        this.#setupEventListeners();
    }

    async connect() {
        try {
            await this.#sequelize.authenticate();
            logger.info('Database connection established');

            this.#models = initModels(this.#sequelize);
            initAssociations(this.#models);

            if (config.env === 'development') {
                await this.#syncDatabase();
            }

            return this.#models;
        } catch (error) {
            logger.error('Unable to connect to the database:', error);
            process.exit(1);
        }
    }

    async #syncDatabase() {
        try {
            await this.#sequelize.sync({ alter: true });
            logger.info('Database schema synchronized');
        } catch (error) {
            logger.error('Database sync failed:', error);
        }
    }

    async disconnect() {
        try {
            await this.#sequelize.close();
            logger.info('Database connection closed');
        } catch (error) {
            logger.error('Error closing database connection:', error);
        }
    }

    async runMigrations() {
        try {
            const { Umzug, SequelizeStorage } = await import('umzug');

            const umzug = new Umzug({
                migrations: {
                    glob: 'src/infrastructure/database/migrations/*.js',
                    resolve: ({ name, path }) => {
                        const migration = import(path);
                        return {
                            name,
                            up: async () => migration.up(this.#sequelize.getQueryInterface(), Sequelize),
                            down: async () => migration.down(this.#sequelize.getQueryInterface(), Sequelize)
                        };
                    }
                },
                context: this.#sequelize.getQueryInterface(),
                storage: new SequelizeStorage({ sequelize: this.#sequelize }),
                logger: console
            });

            await umzug.up();
            logger.info('Migrations executed successfully');
        } catch (error) {
            logger.error('Migrations failed:', error);
            throw error;
        }
    }

    #setupEventListeners() {
        this.#sequelize.addHook('beforeBulkCreate', (instances) => {
            instances.forEach(instance => {
                if (instance.id === undefined) {
                    instance.id = uuidv4();
                }
            });
        });

        this.#sequelize.addHook('beforeValidate', (instance) => {
            if (instance.isNewRecord && !instance.id) {
                instance.id = uuidv4();
            }
        });

        this.#sequelize.addHook('afterCreate', (instance) => {
            logger.info(`Created ${instance.constructor.name} with ID: ${instance.id}`);
        });

        this.#sequelize.addHook('afterUpdate', (instance) => {
            logger.info(`Updated ${instance.constructor.name} with ID: ${instance.id}`);
        });
    }

    get models() {
        return this.#models;
    }

    get sequelize() {
        return this.#sequelize;
    }
}

export default new Database();