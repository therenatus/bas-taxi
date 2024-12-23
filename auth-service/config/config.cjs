
'use strict';

module.exports = {
  development: {
    username: process.env.DB_USERNAME || 'user',
    password: process.env.DB_PASSWORD || 'pass',
    database: process.env.DB_NAME || 'authdb',
    host: process.env.DB_HOST || 'mysql-auth',
    dialect: 'mysql',
  },
  test: {
    username: process.env.DB_USERNAME || 'user',
    password: process.env.DB_PASSWORD || 'pass',
    database: process.env.DB_NAME_TEST || 'authdb_test',
    host: process.env.DB_HOST || 'mysql-auth',
    dialect: 'mysql',
  },
  production: {
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME_PROD,
    host: process.env.DB_HOST,
    dialect: 'mysql',
  },
};
