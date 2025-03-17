// Пример модели chat-participant.model.js
export default (sequelize, DataTypes) => {
    const ChatParticipant = sequelize.define('ChatParticipant', {
        chat_id: {
            type: DataTypes.UUID,
            allowNull: false,
            // Если раньше было:
            // references: {
            //    model: 'users',
            //    key: 'id'
            // }
        },
        user_id: {
            type: DataTypes.UUID,
            allowNull: false,
            // Удалите или закомментируйте внешний ключ, если данные пользователя не будут храниться локально
            // references: {
            //    model: 'users',
            //    key: 'id'
            // }
        }
    }, {
        tableName: 'chat_participants',
        timestamps: false,
    });

    return ChatParticipant;
};
