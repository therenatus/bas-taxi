import { DataTypes } from 'sequelize';
import sequelize from '../utils/sequelize.js';

const CarClass = sequelize.define('CarClass', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, unique: true, allowNull: false },
}, { tableName: 'car_classes' });

export default CarClass;