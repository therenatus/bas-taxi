import { Model, DataTypes } from 'sequelize';
import sequelize from '../utils/database.js';

class Driver extends Model {}

Driver.init({
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
        allowNull: false,
    },
    address: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    city: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    technicalPassport: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    carBrand: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    carModel: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    licensePlate: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    manufactureDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    vinCode: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            len: [17, 17],
        },
    },
    driversLicensePhoto: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    technicalPassportFrontPhoto: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    technicalPassportBackPhoto: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    identityDocumentFrontPhoto: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    identityDocumentWithHandsPhoto: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    carPhotoFront: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    carPhotoRight: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    carPhotoBack: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    carPhotoLeft: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    carPhotoFrontPassenger: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    carPhotoRearSeats: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    carPhotoOpenTrunk: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    isApproved: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
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
    modelName: 'Driver',
    tableName: 'drivers',
    timestamps: true,
});

export default Driver;
