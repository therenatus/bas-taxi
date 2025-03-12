
export default (sequelize, DataTypes) => {
    const Chat = sequelize.define('Chat', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        status: {
            type: DataTypes.ENUM('active', 'archived', 'deleted'),
            defaultValue: 'active'
        },
        lastActivity: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        }
    }, {
        tableName: 'chats',
        timestamps: true,
        indexes: [
            {
                fields: ['rideId']
            },
            {
                fields: ['status']
            }
        ]
    });

    return Chat;
};