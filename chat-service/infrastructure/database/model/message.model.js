export default (sequelize, DataTypes) => {
    const Message = sequelize.define('Message', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        content: {
            type: DataTypes.TEXT,
            validate: {
                len: [1, 2000]
            }
        },
        status: {
            type: DataTypes.ENUM('sent', 'delivered', 'read', 'deleted'),
            defaultValue: 'sent'
        },
        edited: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        sender_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            }
        },
        receiver_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            }
        },
        chat_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'chats',
                key: 'id'
            }
        }
    }, {
        tableName: 'messages',
        timestamps: true,
        paranoid: true,
        indexes: [
            {
                fields: ['chat_id']
            },
            {
                fields: ['sender_id']
            },
            {
                fields: ['receiver_id']
            },
            {
                fields: ['created_at']
            }
        ]
    });

    return Message;
};