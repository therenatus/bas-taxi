import { DataTypes } from 'sequelize';
import sequelize from '../utils/database.js';

const ReviewView = sequelize.define('ReviewView', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
    },
    rideId: {
        type: DataTypes.INTEGER,
    },
    passengerId: {
        type: DataTypes.INTEGER,
    },
    driverId: {
        type: DataTypes.INTEGER,
    },
    rating: {
        type: DataTypes.INTEGER,
    },
    comment: {
        type: DataTypes.TEXT,
    },
    date: {
        type: DataTypes.DATE,
    },
    origin: {
        type: DataTypes.STRING,
    },
    destination: {
        type: DataTypes.STRING,
    },
}, {
    tableName: 'review_view',
    timestamps: false,
});

export default ReviewView;
