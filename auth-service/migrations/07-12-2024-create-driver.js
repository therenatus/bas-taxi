'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('drivers', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false,
            },
            userId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id',
                },
                onDelete: 'CASCADE',
            },
            address: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            city: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            technicalPassport: {
                type: Sequelize.STRING,
                allowNull: true,
            },
            carBrand: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            carModel: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            licensePlate: {
                type: Sequelize.STRING,
                allowNull: false,
                unique: true,
            },
            manufactureDate: {
                type: Sequelize.DATEONLY,
                allowNull: false,
            },
            vinCode: {
                type: Sequelize.STRING,
                allowNull: false,
                unique: true,
            },
            driversLicensePhoto: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            technicalPassportFrontPhoto: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            technicalPassportBackPhoto: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            identityDocumentFrontPhoto: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            identityDocumentWithHandsPhoto: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            carPhotoFront: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            carPhotoRight: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            carPhotoBack: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            carPhotoLeft: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            carPhotoFrontPassenger: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            carPhotoRearSeats: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            carPhotoOpenTrunk: {
                type: Sequelize.STRING,
                allowNull: false,
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
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('drivers');
    }
};
