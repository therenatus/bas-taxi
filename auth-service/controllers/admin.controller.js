import {
  createAdminService,
  getAdminByIdService,
  loginAdminService,
} from "../services/admin.service.js";
import logger from "../utils/logger.js";

export const createAdmin = async (req, res) => {
  try {
    const adminData = await createAdminService(req.body);

    res.status(201).json({
      message: "Аккаунт успешно создан",
      admin: {
        id: adminData.id,
        email: adminData.email,
        password: adminData.password,
        role: adminData.role,
        city: adminData.city,
        twoFactorSecret: adminData.twoFactorSecret,
        createdAt: adminData.createdAt,
      },
    });
  } catch (error) {
    logger.error("Ошибка при создании администратора", {
      error: error.message,
    });
    res.status(400).json({ error: error.message });
  }
};

export const loginAdmin = async (req, res) => {
  console.log({ body: req.body });
  try {
    const result = await loginAdminService(req.body);
    console.log({ result });
    res.status(200).json(result);
  } catch (error) {
    logger.error("Ошибка входа администратора", { error: error.message });
    res.status(401).json({ error: error.message });
  }
};

export const getAdminById = async (req, res) => {
  try {
    const admin = await getAdminByIdService(req.params.id);
    res.json(admin);
  } catch (error) {
    logger.error("Ошибка получения администратора", { error: error.message });
    res.status(404).json({ error: error.message });
  }
};
