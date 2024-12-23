require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('authdb', 'user', 'pass', {
    host: 'postgres-auth',
    dialect: 'postgres',
});

module.exports = sequelize;
