import { DataTypes } from 'sequelize';
import sequelize from '../utils/database.js';

const DriverBalance = sequelize.define('DriverBalance', {
    driverId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
    },
    balance: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
    },
}, {
    tableName: 'driver_balances',
    timestamps: false,
});

export default DriverBalance;
