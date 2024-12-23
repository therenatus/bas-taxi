import { DataTypes } from 'sequelize';
import sequelize from '../utils/database.js';

const Review = sequelize.define('Review', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    rideId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    passengerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    driverId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    rating: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: { min: 1, max: 5 },
    },
    comment: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
}, {
    tableName: 'reviews',
    timestamps: true,
});

export default Review;
