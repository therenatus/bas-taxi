import { Model, DataTypes } from 'sequelize';
import sequelize from '../utils/database.js';

class Admin extends Model {}

Admin.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    role: {
        type: DataTypes.ENUM('admin', 'superadmin', 'moderator'),
        allowNull: false,
    },
    city: {
        type: DataTypes.STRING,
        allowNull: true,
    },
}, {
    sequelize,
    modelName: 'Admin',
    tableName: 'admins',
    timestamps: true,
});

export default Admin;
