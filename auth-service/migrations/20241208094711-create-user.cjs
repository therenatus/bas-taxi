export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable('users', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    phoneNumber: {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true,
    },
    role: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'passenger',
    },
    isApproved: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    },
    isPhoneVerified: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    },
    verificationCode: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    lastSmsSentAt: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    fullName: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    address: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    city: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    technicalPassport: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    carBrand: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    carModel: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    licensePlate: {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true,
    },
    manufactureDate: {
      type: Sequelize.DATEONLY,
      allowNull: true,
    },
    vinCode: {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true,
    },
    driversLicensePhoto: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    technicalPassportFrontPhoto: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    technicalPassportBackPhoto: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    identityDocumentFrontPhoto: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    identityDocumentWithHandsPhoto: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    carPhotoFront: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    carPhotoRight: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    carPhotoBack: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    carPhotoLeft: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    carPhotoFrontPassenger: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    carPhotoRearSeats: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    carPhotoOpenTrunk: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    createdAt: {
      allowNull: false,
      type: Sequelize.DATE,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    },
    updatedAt: {
      allowNull: false,
      type: Sequelize.DATE,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    },
  });
};

export const down = async (queryInterface, Sequelize) => {
  await queryInterface.dropTable('users');
};