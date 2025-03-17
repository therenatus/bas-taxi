export default (sequelize, DataTypes) => {
    const Chat = sequelize.define('Chat', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        status: {
            type: DataTypes.ENUM('active', 'archived', 'deleted'),
            defaultValue: 'active',
            validate: {
                isIn: [['active', 'archived', 'deleted']]
            }
        },
        last_activity: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
            field: 'last_activity'
        },
        ride_id: {
            type: DataTypes.UUID,
            allowNull: true
        },
        type: {
            type: DataTypes.ENUM('ride', 'support'),
            defaultValue: 'ride',
            validate: {
                isIn: [['ride', 'support']]
            }
        },
        admin_id: {
            type: DataTypes.UUID,
            allowNull: true
        }
    }, {
        tableName: 'chats',
        timestamps: true,
        indexes: [
            { fields: ['ride_id'] },
            { fields: ['status'] },
            { fields: ['admin_id'] }
        ],
        hooks: {
            beforeValidate: (chat) => {
                if (chat.type === 'support' && !chat.admin_id) {
                    throw new Error('admin_id required for support chats');
                }
            }
        }
    });

    return Chat;
};