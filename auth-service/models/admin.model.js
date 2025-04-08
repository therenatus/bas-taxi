import { Model, DataTypes } from 'sequelize';
import sequelize from '../utils/database.js';
import logger from '../utils/logger.js';

class Admin extends Model {}

Admin.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.ENUM('admin', 'superadmin', 'moderator'), allowNull: false },
    city: { type: DataTypes.STRING, allowNull: true },
    twoFactorSecret: { type: DataTypes.STRING, allowNull: true },
    twoFactorEnabled: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { sequelize, modelName: 'Admin', tableName: 'admins', timestamps: true });

export default Admin;