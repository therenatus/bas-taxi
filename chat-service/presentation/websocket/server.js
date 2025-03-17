import { Server } from "socket.io";
import {ChatHandler} from "./handlres/chat.handler.js";

export const createWebSocketServer = (httpServer, chatService) => {
    const io = new Server(httpServer, {
        cors: {
           origin: true,
            methods: ["GET", "POST"]
        }
    });

    new ChatHandler(io, chatService).initialize();
    return io;
};