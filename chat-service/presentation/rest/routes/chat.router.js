import express from "express";
import { ChatController } from "../controllers/chat.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

export const createChatRoutes = ({ chatController, authService }) => {
    const router = express.Router();

    router.use(authMiddleware());

    router.get("/",
        authMiddleware(["admin", "superadmin"]),
        chatController.getChatHistory
    );

    router.post("/",
        authMiddleware(["driver", "passenger", "admin"]),
        chatController.sendMessage
    );

    return router;
};