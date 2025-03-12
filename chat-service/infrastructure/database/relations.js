export default function initAssociations() {
    const { User, Ride, Chat, Message, Attachment } = models;

    // Чат ↔ Поездка
    Chat.belongsTo(Ride, {
        foreignKey: 'rideId',
        as: 'ride'
    });

    // Чат ↔ Участники (многие-ко-многим)
    Chat.belongsToMany(User, {
        through: 'ChatParticipants',
        foreignKey: 'chatId',
        as: 'participants'
    });

    // Сообщение ↔ Чат
    Message.belongsTo(Chat, {
        foreignKey: 'chatId',
        as: 'chat'
    });

    // Сообщение ↔ Отправитель
    Message.belongsTo(User, {
        foreignKey: 'senderId',
        as: 'sender'
    });

    // Сообщение ↔ Вложения (один-ко-многим)
    Message.hasMany(Attachment, {
        foreignKey: 'messageId',
        as: 'attachments'
    });

    // Поездка ↔ Водитель и Пассажир
    Ride.belongsTo(User, {
        foreignKey: 'driverId',
        as: 'driver'
    });

    Ride.belongsTo(User, {
        foreignKey: 'passengerId',
        as: 'passenger'
    });
}