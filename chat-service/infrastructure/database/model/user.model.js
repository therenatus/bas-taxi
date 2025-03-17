export default (sequelize, DataTypes) => {
    const User = sequelize.define('User', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        user_type: {
            type: DataTypes.ENUM('driver', 'passenger', 'admin'),
            allowNull: false
        },
        role: {
            type: DataTypes.ENUM('driver', 'passenger', 'admin', 'superadmin'),
            allowNull: false
        },
        username: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        email: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true,
            validate: {
                isEmail: true
            }
        },
        status: {
            type: DataTypes.ENUM('active', 'inactive', 'suspended'),
            defaultValue: 'active'
        }
    }, {
        tableName: 'users',
        timestamps: true,
        paranoid: true,
        indexes: [
            {
                fields: ['user_type']
            },
            {
                fields: ['role']
            }
        ]
    });

    return User;
};