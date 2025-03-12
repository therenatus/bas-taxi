import UserModel from './user.model.js';
import ChatModel from "./chat.model.js";
import MessageModel from "./message.model.js";
import RideModel from "./ride.model.js";

const initModels = (sequelize) => {
    const models = {
        User: UserModel(sequelize),
        Chat: ChatModel(sequelize),
        Message: MessageModel(sequelize),
        Ride: RideModel(sequelize),
    };

    return models;
};

export default initModels;
