'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'fullName', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('users', 'address', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('users', 'city', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('users', 'technicalPassport', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('users', 'carBrand', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('users', 'carModel', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('users', 'licensePlate', {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true,
    });
    await queryInterface.addColumn('users', 'manufactureDate', {
      type: Sequelize.DATEONLY,
      allowNull: true,
    });
    await queryInterface.addColumn('users', 'vinCode', {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true,
    });
    await queryInterface.addColumn('users', 'driversLicensePhoto', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('users', 'technicalPassportFrontPhoto', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('users', 'technicalPassportBackPhoto', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('users', 'identityDocumentFrontPhoto', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('users', 'identityDocumentWithHandsPhoto', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('users', 'carPhotoFront', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('users', 'carPhotoRight', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('users', 'carPhotoBack', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('users', 'carPhotoLeft', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('users', 'carPhotoFrontPassenger', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('users', 'carPhotoRearSeats', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('users', 'carPhotoOpenTrunk', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('users', 'fullName');
    await queryInterface.removeColumn('users', 'address');
    await queryInterface.removeColumn('users', 'city');
    await queryInterface.removeColumn('users', 'technicalPassport');
    await queryInterface.removeColumn('users', 'carBrand');
    await queryInterface.removeColumn('users', 'carModel');
    await queryInterface.removeColumn('users', 'licensePlate');
    await queryInterface.removeColumn('users', 'manufactureDate');
    await queryInterface.removeColumn('users', 'vinCode');
    await queryInterface.removeColumn('users', 'driversLicensePhoto');
    await queryInterface.removeColumn('users', 'technicalPassportFrontPhoto');
    await queryInterface.removeColumn('users', 'technicalPassportBackPhoto');
    await queryInterface.removeColumn('users', 'identityDocumentFrontPhoto');
    await queryInterface.removeColumn('users', 'identityDocumentWithHandsPhoto');
    await queryInterface.removeColumn('users', 'carPhotoFront');
    await queryInterface.removeColumn('users', 'carPhotoRight');
    await queryInterface.removeColumn('users', 'carPhotoBack');
    await queryInterface.removeColumn('users', 'carPhotoLeft');
    await queryInterface.removeColumn('users', 'carPhotoFrontPassenger');
    await queryInterface.removeColumn('users', 'carPhotoRearSeats');
    await queryInterface.removeColumn('users', 'carPhotoOpenTrunk');
  }
};
