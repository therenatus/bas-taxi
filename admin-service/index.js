import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import morgan from "morgan";
import adminRoutes from "./routes/admin.route.js";
import setupSwagger from "./swaggger.js";
import sequelize from "./utils/database.js";
import logger from "./utils/logger.js";
import { connectRabbitMQ } from "./utils/rabbitmq.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3008;

const corsOptions = {
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Correlation-ID",
    "x-correlation-id",
    "x-admin-id",
  ],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

app.options("*", cors(corsOptions));

app.use(express.json());

const morganStream = {
  write: (message) => {
    console.log(message.trim());
    logger.info(message.trim());
  },
};

app.use(morgan("combined", { stream: morganStream }));

app.use((req, res, next) => {
  logger.info(
    `Admin Service: Получен запрос ${req.method} ${req.url} CorrelationID: ${
      req.headers["x-correlation-id"] || "none"
    }`
  );
  next();
});

setupSwagger(app);
app.use("/", adminRoutes);

sequelize
  .authenticate()
  .then(() => {
    logger.info("Успешное подключение к базе данных");
    return sequelize.sync();
  })
  .then(() => {
    logger.info("Модели синхронизированы");
  })
  .catch((err) => {
    logger.error("Ошибка подключения к базе данных", { error: err.message });
  });

connectRabbitMQ().catch((err) => {
  logger.error("Ошибка при подключении к RabbitMQ", { error: err.message });
});

app.use((err, req, res, next) => {
  logger.error("Необработанная ошибка", {
    message: err.message,
    stack: err.stack,
  });
  res.status(500).json({ error: "Внутренняя ошибка сервера" });
});

app.listen(PORT, () => {
  logger.info(`Admin Service запущен на порту ${PORT}`);
});
