import { Server } from "socket.io";
import { ChatHandler } from "./handlres/chat.handler.js";

export const createWebSocketServer = (httpServer, chatService, authService) => {
  const io = new Server(httpServer, {
    cors: {
      origin: true,
      methods: ["GET", "POST"],
    },
  });

  new ChatHandler(io, chatService, authService).initialize();
  return io;
};
