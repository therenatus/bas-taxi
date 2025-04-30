import jwt from "jsonwebtoken";
import { ApplicationError } from "../exceptions/application.error.js";

export class AuthService {
  #secretKey;

  constructor() {
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET не установлен в переменных окружения");
    }
    this.#secretKey = process.env.JWT_SECRET;
  }

  async verifyToken(token) {
    try {
      const decodedWithoutVerify = jwt.decode(token);
      console.log(
        "Декодированный токен (без проверки подписи):",
        decodedWithoutVerify
      );

      const decoded = jwt.verify(token, this.#secretKey);

      let userType, userId;

      if (decoded.adminId) {
        userType = "admin";
        userId = decoded.adminId;
      } else if (decoded.driverId) {
        userType = "driver";
        userId = decoded.driverId;
      } else if (decoded.userId) {
        userType = "passenger";
        userId = decoded.userId;
      }

      if (!userType || !userId) {
        throw new Error("Не удалось определить тип пользователя или ID");
      }

      return { userType, userId, role: decoded.role };
    } catch (error) {
      console.error("Ошибка при проверке токена:", error.message);
      console.error("Стек ошибки:", error.stack);
      throw new ApplicationError(
        "Недействительный токен",
        "INVALID_TOKEN",
        401
      );
    }
  }
}
