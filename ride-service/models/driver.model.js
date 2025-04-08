// models/driverModel.js
import { DataTypes } from 'sequelize';
import sequelize from '../utils/sequelize.js';

const Driver = sequelize.define('Driver', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    driverId: {
        type: DataTypes.INTEGER,
    },
    isOnline: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    isParkingMode: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
}, {
    tableName: 'drivers',
    timestamps: true,
});

export default Driver;
