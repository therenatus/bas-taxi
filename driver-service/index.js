const express = require('express');
const app = express();
const sequelize = require('./config/database');
const User = require('./models/User');
const amqp = require('amqplib');
const driverRoutes = require('./routes/drive.routes');

app.use('/drivers', driverRoutes);


let channel;

(async () => {
    const connection = await amqp.connect('amqp://rabbitmq');
    channel = await connection.createChannel();
    await channel.assertQueue('driver_verification');

    // Обработка сообщений
    channel.consume('driver_verification', async (msg) => {
        const data = JSON.parse(msg.content.toString());
        const { userId } = data;

        const user = await User.findByPk(userId);
        if (user) {
            user.isApproved = true;
            await user.save();
        }

        channel.ack(msg);
    });
})();

sequelize.sync().then(() => {
    app.listen(3002, () => {
        console.log('Driver Verification Service running on port 3002');
    });
}).catch(err => {
    console.error('Database connection error:', err);
});
