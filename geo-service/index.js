import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from './utils/config.js';
import geoRoutes from './routes/geo.route.js';
import socketHandler from './sockets/socket.js';
import logger from './utils/logger.js';
import { connectRabbitMQ } from './utils/rabbitmq.js';
import { subscribeToRideRequests } from './services/geo.subscriber.js';

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());

app.use('/', geoRoutes);

io.on('connection', (socket) => {
    logger.info(`Новый клиент подключился: ${socket.id}`);
    socketHandler(io, socket);
});

const PORT = process.env.PORT || 3088;
server.listen(PORT, async () => {
    logger.info(`Geo-Service запущен на порту ${PORT}`);

    await connectRabbitMQ();
    await subscribeToRideRequests();
});
