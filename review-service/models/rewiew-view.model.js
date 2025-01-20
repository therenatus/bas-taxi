import { DataTypes } from 'sequelize';
import sequelize from '../utils/database.js';

const ReviewView = sequelize.define('ReviewView', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
    },
    averageRating: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
    },
    reviewCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
}, {
    tableName: 'review_view',
    timestamps: false,
});

export default ReviewView;
