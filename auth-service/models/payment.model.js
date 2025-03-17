import { Model, DataTypes } from 'sequelize';
import sequelize from '../utils/database.js';
import { encryptData, decryptData } from '../utils/encryption.js';

class PaymentDetails extends Model {}

PaymentDetails.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    passengerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    cardNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        set(value) {
            this.setDataValue('cardNumber', encryptData(value));
        },
        get() {
            const rawValue = this.getDataValue('cardNumber');
            return decryptData(rawValue);
        },
    },
    cardHolderName: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    expirationDate: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            is: /^\d{2}\/\d{2}$/i,
        },
    },
    cvc: {
        type: DataTypes.STRING,
        allowNull: false,
        set(value) {
            this.setDataValue('cvc', encryptData(value));
        },
        get() {
            const rawValue = this.getDataValue('cvc');
            return decryptData(rawValue);
        },
    },
}, {
    sequelize,
    modelName: 'PaymentDetails',
    tableName: 'payment_details',
    timestamps: true,
});

export default PaymentDetails;
