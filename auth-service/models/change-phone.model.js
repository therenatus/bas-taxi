import { Model, DataTypes } from 'sequelize';
import sequelize from '../utils/database.js';
import User from "./user.model.js";

class ChangePhone extends Model {}

ChangePhone.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    phoneNumber: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    verificationCode: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    lastSmsSentAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
}, {
    sequelize,
    modelName: 'ChangePhone',
    tableName: 'change_phones',
    timestamps: true,
});

ChangePhone.belongsTo(User, { foreignKey: 'user_id' });

export default ChangePhone;
