export default (sequelize, DataTypes) => {
    const Ride = sequelize.define('Ride', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        status: {
            type: DataTypes.ENUM('pending', 'active', 'completed', 'canceled'),
            defaultValue: 'pending'
        },
        start_location: {
            type: DataTypes.GEOMETRY('POINT'),
            allowNull: false
        },
        end_location: {
            type: DataTypes.GEOMETRY('POINT'),
            allowNull: true
        },
        started_at: {
            type: DataTypes.DATE,
            field: 'started_at'
        },
        completed_at: {
            type: DataTypes.DATE,
            field: 'completed_at'
        },
        driver_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            }
        },
        passenger_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            }
        }
    }, {
        tableName: 'rides',
        timestamps: true,
        indexes: [
            {
                fields: ['status']
            },
            {
                fields: ['driver_id']
            },
            {
                fields: ['passenger_id']
            }
        ]
    });

    return Ride;
};