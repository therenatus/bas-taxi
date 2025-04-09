import { Model, DataTypes } from 'sequelize';
import sequelize from '../utils/database.js';

class User extends Model {}

User.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    phoneNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    fullName: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    role: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'passenger',
    },
    verificationCode: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    lastSmsSentAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    isBlocked: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    isDeleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    blockReason: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    blockedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    blockedAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    deletedAt: {
        type: DataTypes.DATE,
        allowNull: true,
    }
}, {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
});

export default User;
