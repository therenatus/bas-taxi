import { DataTypes } from 'sequelize';
import sequelize from '../utils/sequelize.js';

const City = sequelize.define('City', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, unique: true, allowNull: false },
}, { tableName: 'cities' });

export default City;
