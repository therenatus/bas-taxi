import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import logger from '../config/logger.js';
import initModels from './model/index.js';
import initAssociations from './relations.js';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();
console.log('fsdfsdfsdfsdf')
console.log({
  DB_NAME: process.env.DB_NAME,
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,
  DB_HOST: process.env.DB_HOST,
  DB_PORT: process.env.DB_PORT
})
class Database {
    constructor() {
        this.sequelize = new Sequelize(
          process.env.DB_NAME || 'authdb',
          process.env.DB_USER || 'user',
          process.env.DB_PASSWORD || 'pass',
          {
              host: 'localhost',
              dialect: 'mysql',
              port:  3312,
              logging: process.env.NODE_ENV === 'development' ? logger.info : false,
              dialectOptions: {
                  ssl: process.env.NODE_ENV === 'production' && {
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
          }
        );

        this.models = null;
        this.#setupHooks();
    }

    #setupHooks() {
        this.sequelize.addHook('beforeBulkCreate', (instances) => {
            instances.forEach(instance => {
                if (!instance.id) {
                    instance.id = uuidv4();
                }
            });
        });

        this.sequelize.addHook('beforeValidate', (instance) => {
            if (instance.isNewRecord && !instance.id) {
                instance.id = uuidv4();
            }
        });

        this.sequelize.addHook('afterCreate', (instance) => {
            logger.info(`Created ${instance.constructor.name} with ID: ${instance.id}`);
        });

        this.sequelize.addHook('afterUpdate', (instance) => {
            logger.info(`Updated ${instance.constructor.name} with ID: ${instance.id}`);
        });
    }

    async connect() {
        try {
            await this.sequelize.authenticate();
            logger.info('📡 Database connected successfully');

            this.models = initModels(this.sequelize);
            initAssociations(this.models);

            return this.models;
        } catch (error) {
            logger.error('❌ Database connection failed:', error);
            process.exit(1);
        }
    }

    async disconnect() {
        try {
            await this.sequelize.close();
            logger.info('📴 Database connection closed');
        } catch (error) {
            logger.error('Error during DB disconnect:', error);
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
                            up: async () => (await migration).up(this.sequelize.getQueryInterface(), Sequelize),
                            down: async () => (await migration).down(this.sequelize.getQueryInterface(), Sequelize)
                        };
                    }
                },
                context: this.sequelize.getQueryInterface(),
                storage: new SequelizeStorage({ sequelize: this.sequelize }),
                logger: console
            });

            await umzug.up();
            logger.info('✅ Migrations executed successfully');
        } catch (error) {
            logger.error('❌ Migrations failed:', error);
        }
    }
}

export default new Database();
