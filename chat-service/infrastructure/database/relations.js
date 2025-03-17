// файл: infrastructure/database/relations.js

export default function initAssociations(models) {
    const { User, Ride, Chat, Message, Attachment, ChatParticipant } = models;

    // Ассоциации для чата
    Chat.belongsTo(Ride, { foreignKey: 'ride_id', as: 'ride' });
    Chat.belongsToMany(User, { through: ChatParticipant, foreignKey: 'chat_id', as: 'participants' });
    Chat.hasMany(Message, { foreignKey: 'chat_id', as: 'messages' });

    // Ассоциации для сообщений
    Message.belongsTo(Chat, { foreignKey: 'chat_id', as: 'chat' });
    Message.belongsTo(User, { foreignKey: 'sender_id', as: 'sender' });
    Message.hasMany(Attachment, { foreignKey: 'message_id', as: 'attachments' });

    // Ассоциации для поездки
    Ride.belongsTo(User, { foreignKey: 'driver_id', as: 'driver' });
    Ride.belongsTo(User, { foreignKey: 'passenger_id', as: 'passenger' });

    // Ассоциации для администратора чата
    Chat.belongsTo(User, { foreignKey: 'admin_id', as: 'admin', constraints: false });

    // Ассоциация участников чата
    Chat.hasMany(ChatParticipant, { foreignKey: 'chat_id' });
    ChatParticipant.belongsTo(Chat, { foreignKey: 'chat_id' });
}
