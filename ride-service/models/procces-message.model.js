import { DataTypes } from 'sequelize';
import sequelize from '../utils/sequelize.js';

const ProcessedMessage = sequelize.define('ProcessedMessage', {
    messageId: {
        type: DataTypes.STRING,
        primaryKey: true,
    },
    processedAt: {
        type: DataTypes.DATE,
        allowNull: false,
    },
}, {
    tableName: 'processed_messages',
    timestamps: false,
});

export default ProcessedMessage;
