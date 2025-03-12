export default (sequelize, DataTypes) => {
    const Ride = sequelize.define('Ride', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        externalId: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        status: {
            type: DataTypes.ENUM('pending', 'active', 'completed', 'canceled'),
            defaultValue: 'pending'
        },
        startLocation: {
            type: DataTypes.GEOGRAPHY('POINT'),
            allowNull: false
        },
        endLocation: {
            type: DataTypes.GEOGRAPHY('POINT')
        },
        startedAt: DataTypes.DATE,
        completedAt: DataTypes.DATE
    }, {
        tableName: 'rides',
        timestamps: true,
        indexes: [
            {
                fields: ['externalId']
            },
            {
                fields: ['status']
            },
            {
                fields: ['driverId']
            }
        ]
    });

    return Ride;
};