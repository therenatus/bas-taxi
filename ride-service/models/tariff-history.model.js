import { DataTypes } from 'sequelize';
import sequelize from '../utils/sequelize.js';

const TariffHistory = sequelize.define('TariffHistory', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tariffId: { type: DataTypes.INTEGER, allowNull: false },
    cityId: { type: DataTypes.INTEGER, allowNull: false },
    carClassId: { type: DataTypes.INTEGER, allowNull: false },
    oldValues: { type: DataTypes.JSON, allowNull: false },
    newValues: { type: DataTypes.JSON, allowNull: false },
    changedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'ID администратора, который внес изменения'
    },
    changeReason: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Причина изменения тарифа'
    }
}, {
    tableName: 'tariff_histories',
    timestamps: true,
    indexes: [
        { fields: ['tariffId'] },
        { fields: ['cityId', 'carClassId'] }
    ]
});

export default TariffHistory;