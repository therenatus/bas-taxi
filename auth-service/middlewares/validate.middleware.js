import { ZodError } from "zod";
import logger from "../utils/logger.js";

const validateMiddleware = (schema) => {
  return (req, res, next) => {
    console.info("body:", req.body);
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        logger.error("validateMiddleware: Ошибка валидации", {
          errors: error.errors,
        });
        return res.status(400).json({ error: error.errors });
      }
      logger.error("validateMiddleware: Неизвестная ошибка", {
        error: error.message,
      });
      return res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  };
};

export const validateSchema = validateMiddleware;
export default validateMiddleware;
