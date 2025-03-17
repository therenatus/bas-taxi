import UserModel from './user.model.js';
import RideModel from './ride.model.js';
import ChatModel from './chat.model.js';
import MessageModel from './message.model.js';
import AtttachmentModel from "./atttachment.model.js";
import ChatParticipantModel from "./chat-participant.model.js";

export default (sequelize, DataTypes) => {
    return {
        User: UserModel(sequelize, DataTypes),
        Ride: RideModel(sequelize, DataTypes),
        Chat: ChatModel(sequelize, DataTypes),
        Message: MessageModel(sequelize, DataTypes),
        Attachment: AtttachmentModel(sequelize, DataTypes),
        ChatParticipant: ChatParticipantModel(sequelize, DataTypes),
    };
};
