export default (sequelize, DataTypes) => {
    const ChatParticipant = sequelize.define('ChatParticipant', {
        chat_id: {
            type: DataTypes.UUID,
            allowNull: false
        },
        user_id: {
            type: DataTypes.UUID,
            allowNull: false
        }
    }, {
        tableName: 'chat_participants',
        timestamps: false,
    });

    return ChatParticipant;
};
