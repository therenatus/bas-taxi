import express from "express";
import helmet from "helmet";
import cors from "cors";

export const createRestServer = (controllers, middlewares) => {
    const app = express();

    app.use(helmet({ contentSecurityPolicy: false }));
    app.use(cors());

    app.use(express.json({ limit: "10kb" }));
    app.use(express.urlencoded({ extended: true }));

    app.use("/chats", controllers.chatRouter);

    // app.use(middlewares.errorHandler);

    return app;
};