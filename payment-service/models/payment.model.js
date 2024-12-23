import { DataTypes } from 'sequelize';
import sequelize from '../utils/database.js';

export const Payment = sequelize.define('Payment', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    rideId: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    passengerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    amount: {
        type: DataTypes.FLOAT,
        allowNull: false,
    },
    status: {
        type: DataTypes.ENUM('pending', 'completed', 'failed'),
        defaultValue: 'pending',
    },
}, {
    tableName: 'payments',
});

export default Payment;
