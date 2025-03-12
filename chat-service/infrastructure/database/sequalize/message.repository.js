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
        }
    }, {
        tableName: 'messages',
        timestamps: true,
        paranoid: true,
        indexes: [
            {
                fields: ['chatId']
            },
            {
                fields: ['senderId']
            },
            {
                fields: ['createdAt']
            }
        ]
    });

    return Message;
};