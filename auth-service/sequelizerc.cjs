// sequelizerc.cjs
const path = require('path');

module.exports = {
    'config': path.resolve('config', 'config.cjs'),
    'migrations-path': path.resolve('migrations'),
    'models-path': path.resolve('models'),
    'seeders-path': path.resolve('seeders'),
};