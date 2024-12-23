'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
    }
  }
  User.init({
    phoneNumber: DataTypes.STRING,
    role: DataTypes.STRING,
    isApproved: DataTypes.BOOLEAN,
    isPhoneVerified: DataTypes.BOOLEAN,
    verificationCode: DataTypes.STRING,
    lastSmsSentAt: DataTypes.DATE,
    address: DataTypes.STRING,
    city: DataTypes.STRING,
    technicalPassport: DataTypes.STRING,
    carBrand: DataTypes.STRING,
    carModel: DataTypes.STRING,
    licensePlate: DataTypes.STRING,
    manufactureDate: DataTypes.DATE,
    vinCode: DataTypes.STRING,
    driversLicensePhoto: DataTypes.STRING,
    technicalPassportFrontPhoto: DataTypes.STRING,
    technicalPassportBackPhoto: DataTypes.STRING,
    identityDocumentFrontPhoto: DataTypes.STRING,
    identityDocumentWithHandsPhoto: DataTypes.STRING,
    carPhotoFront: DataTypes.STRING,
    carPhotoRight: DataTypes.STRING,
    carPhotoBack: DataTypes.STRING,
    carPhotoLeft: DataTypes.STRING,
    carPhotoFrontPassenger: DataTypes.STRING,
    carPhotoRearSeats: DataTypes.STRING,
    carPhotoOpenTrunk: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'User',
  });
  return User;
};