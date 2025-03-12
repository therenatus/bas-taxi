import express from "express";
import helmet from "helmet";
import cors from "cors";

export const createRestServer = (controllers, middlewares) => {
    const app = express();

    app.use(helmet());
    app.use(cors({
        origin: process.env.CORS_ORIGINS.split(","),
        methods: ["GET", "POST", "PUT", "DELETE"]
    }));

    app.use(express.json({ limit: "10kb" }));
    app.use(express.urlencoded({ extended: true }));

    app.use("/api/v1/chats", controllers.chatRouter);

    app.use(middlewares.errorHandler);

    return app;
};