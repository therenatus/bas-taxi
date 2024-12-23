import { DataTypes } from 'sequelize';
import sequelize from '../utils/database.js';


export const Balance = sequelize.define('Balance', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    driverId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
    },
    amount: {
        type: DataTypes.FLOAT,
        defaultValue: 0.0,
    },
}, {
    tableName: 'balances',
    timestamps: true,
});



export default Balance;
