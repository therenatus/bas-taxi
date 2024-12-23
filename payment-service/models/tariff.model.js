import { DataTypes } from 'sequelize';
import sequelize from '../utils/database.js';

const Tariff = sequelize.define('Tariff', {
    city: {
        type: DataTypes.STRING,
        primaryKey: true,
    },
    commissionPercentage: {
        type: DataTypes.FLOAT,
        allowNull: false,
    },
}, {
    tableName: 'tariffs',
    timestamps: true,
});

export default Tariff;
