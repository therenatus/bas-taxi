import { DataTypes } from 'sequelize';
import sequelize from '../utils/database.js';

const Ride = sequelize.define('Ride', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    passengerId: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    driverId: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    origin: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    destination: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    originName: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    destinationName: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    city: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    distance: {
        type: DataTypes.FLOAT,
        allowNull: true,
    },
    price: {
        type: DataTypes.FLOAT,
        allowNull: true,
    },
    paymentType: {
        type: DataTypes.ENUM('cash', 'card'),
        allowNull: false,
        defaultValue: 'cash',
    },
    status: {
        type: DataTypes.ENUM('pending', 'driver_assigned', 'in_progress', 'completed', 'cancelled', "on_site"),
        defaultValue: 'pending',
    },
    cancellationReason: {
        type: DataTypes.STRING,
        allowNull: true,
    },
}, {
    tableName: 'rides',
    timestamps: true,
});

export default Ride;