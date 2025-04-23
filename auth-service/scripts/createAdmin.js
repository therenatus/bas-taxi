import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import speakeasy from "speakeasy";
import Admin from "../models/admin.model.js";
import sequelize from "../utils/database.js";
import logger from "../utils/logger.js";

dotenv.config();

const createSuperAdmin = async () => {
  try {
    await sequelize.authenticate();
    logger.info("Успешное подключение к базе данных");

    await sequelize.sync();

    const email = "superadmin@example.com";
    const existingAdmin = await Admin.findOne({ where: { email } });

    if (existingAdmin) {
      logger.info("Суперадмин уже существует");
      return;
    }

    const secret = speakeasy.generateSecret({ length: 20 });
    const hashedPassword = await bcrypt.hash("b@$T@xxx1Password", 10);

    const admin = await Admin.create({
      email,
      password: hashedPassword,
      role: "superadmin",
      city: "ALL",
      twoFactorSecret: secret.base32,
      twoFactorEnabled: true,
    });

    logger.info("Суперадмин успешно создан", {
      adminId: admin.id,
      email: admin.email,
      otpauthUrl: secret.otpauth_url,
    });
  } catch (error) {
    logger.error("Ошибка при создании суперадмина", { error: error.message });
    throw error;
  } finally {
    await sequelize.close();
  }
};

createSuperAdmin().catch(console.error);
