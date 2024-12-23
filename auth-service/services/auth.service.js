// // services/authService.js
// import logger from '../utils/logger.js';
// import User from '../models/user.model.js';
// import Driver from '../models/driver.model.js';
// import { generateVerificationCode } from '../utils/generate-code.js';
// import jwt from 'jsonwebtoken';
// import {sendVerificationCode} from "../utils/sms.service.js";
// import Admin from "../models/admin.model.js";
// import bcrypt from 'bcryptjs';
//
// const SMS_SEND_INTERVAL_MS = 60 * 1000; // 1 минута
//
// // Сервис для регистрации пассажира
// export const registerPassengerService = async ({ phoneNumber }) => {
//     logger.info('registerPassengerService: Начало регистрации пассажира');
//
//     // Проверка уникальности номера телефона
//     const existingUser = await User.findOne({ where: { phoneNumber } });
//     if (existingUser) {
//         logger.warn('registerPassengerService: Пользователь с таким номером телефона уже существует', { phoneNumber });
//         throw new Error('Номер телефона уже используется');
//     }
//
//     const verificationCode = generateVerificationCode();
//     logger.info('registerPassengerService: Сгенерирован код верификации', { verificationCode });
//
//     // Создание пользователя
//     const user = await User.create({
//         phoneNumber,
//         role: 'passenger',
//         fullName: phoneNumber,
//         isApproved: true,
//         isPhoneVerified: true,
//         verificationCode,
//         lastSmsSentAt: new Date(),
//     });
//     logger.info('registerPassengerService: Пользователь создан', { user });
//
//     // Отправка кода верификации
//     await sendVerificationCode(phoneNumber, verificationCode);
//     logger.info('registerPassengerService: Код верификации отправлен', { phoneNumber, verificationCode });
//
//     return user;
// };
//
// // Сервис для регистрации водителя
// export const registerDriverService = async ({
//                                                 phoneNumber,
//                                                 fullName,
//                                                 address,
//                                                 city,
//                                                 technicalPassport,
//                                                 carBrand,
//                                                 carModel,
//                                                 licensePlate,
//                                                 manufactureDate,
//                                                 vinCode,
//                                                 driversLicensePhoto,
//                                                 technicalPassportFrontPhoto,
//                                                 technicalPassportBackPhoto,
//                                                 identityDocumentFrontPhoto,
//                                                 identityDocumentWithHandsPhoto,
//                                                 carPhotoFront,
//                                                 carPhotoRight,
//                                                 carPhotoBack,
//                                                 carPhotoLeft,
//                                                 carPhotoFrontPassenger,
//                                                 carPhotoRearSeats,
//                                                 carPhotoOpenTrunk,
//                                             }) => {
//     logger.info('registerDriverService: Начало регистрации водителя');
//
//     // Проверка уникальности номера телефона
//     const existingDriverByPhone = await Driver.findOne({ where: { phoneNumber } });
//     if (existingDriverByPhone) {
//         logger.warn('registerDriverService: Водитель с таким номером телефона уже существует', { phoneNumber });
//         throw new Error('Номер телефона уже используется');
//     }
//
//     // Проверка уникальности licensePlate и vinCode
//     const existingLicensePlate = await Driver.findOne({ where: { licensePlate } });
//     if (existingLicensePlate) {
//         logger.warn('registerDriverService: Госномер уже используется', { licensePlate });
//         throw new Error('Госномер уже используется');
//     }
//
//     const existingVinCode = await Driver.findOne({ where: { vinCode } });
//     if (existingVinCode) {
//         logger.warn('registerDriverService: VIN код уже используется', { vinCode });
//         throw new Error('VIN код уже используется');
//     }
//
//     const verificationCode = generateVerificationCode();
//     logger.info('registerDriverService: Сгенерирован код верификации', { verificationCode });
//
//     // Создание водителя
//     const driver = await Driver.create({
//         phoneNumber,
//         fullName,
//         address,
//         city,
//         technicalPassport,
//         carBrand,
//         carModel,
//         licensePlate,
//         manufactureDate,
//         vinCode,
//         driversLicensePhoto,
//         technicalPassportFrontPhoto,
//         technicalPassportBackPhoto,
//         identityDocumentFrontPhoto,
//         identityDocumentWithHandsPhoto,
//         carPhotoFront,
//         carPhotoRight,
//         carPhotoBack,
//         carPhotoLeft,
//         carPhotoFrontPassenger,
//         carPhotoRearSeats,
//         carPhotoOpenTrunk,
//     });
//     logger.info('registerDriverService: Водитель создан', { driver });
//
//     // Отправка кода верификации
//     await sendVerificationCode(phoneNumber, verificationCode);
//     logger.info('registerDriverService: Код верификации отправлен', { phoneNumber, verificationCode });
//
//     return driver;
// };
//
//
// // Сервис для логина водителя
// export const loginDriverService = async ({ phoneNumber }) => {
//     logger.info('loginDriverService: Начало логина водителя');
//
//     // Поиск водителя
//     const driver = await Driver.findOne({ where: { phoneNumber } });
//
//     if (!driver) {
//         logger.warn('loginDriverService: Водитель с таким номером телефона не найден', { phoneNumber });
//         throw new Error('Водитель не найден');
//     }
//
//     if (!driver.isApproved) {
//         logger.warn('loginDriverService: Водитель ещё не подтверждён', { phoneNumber });
//         throw new Error('Водитель ещё не подтверждён');
//     }
//
//     // Проверка интервала между отправками SMS
//     const now = new Date();
//     if (driver.lastSmsSentAt && now - driver.lastSmsSentAt < SMS_SEND_INTERVAL_MS) {
//         const remainingTime = Math.ceil((SMS_SEND_INTERVAL_MS - (now - driver.lastSmsSentAt)) / 1000);
//         logger.warn('loginDriverService: Слишком частая отправка SMS', { phoneNumber, remainingTime });
//         throw new Error(`Подождите ${remainingTime} секунд перед повторной отправкой SMS`);
//     }
//
//     const verificationCode = generateVerificationCode();
//     logger.info('loginDriverService: Сгенерирован новый код верификации', { verificationCode });
//
//     driver.verificationCode = verificationCode;
//     driver.lastSmsSentAt = now;
//     await driver.save();
//     logger.info('loginDriverService: Обновлён код верификации в базе данных', { phoneNumber, verificationCode });
//
//     await sendVerificationCode(phoneNumber, verificationCode);
//     logger.info('loginDriverService: Код верификации отправлен', { phoneNumber, verificationCode });
//
//     return;
// };
//
//
// // Сервис для подтверждения логина
// export const confirmLoginService = async ({ phoneNumber, verificationCode }) => {
//     logger.info('confirmLoginService: Начало подтверждения логина');
//
//     // Поиск пользователя в таблице пользователей
//     let user = await User.findOne({ where: { phoneNumber } });
//
//     // Если не найден в таблице пользователей, ищем в таблице водителей через связь с пользователем
//     let driver = null;
//     if (!user) {
//         driver = await Driver.findOne({ include: [{ model: User, where: { phoneNumber } }] });
//         if (driver) {
//             user = driver.User;
//         }
//     }
//
//     if (!user) {
//         logger.warn('confirmLoginService: Пользователь с таким номером телефона не найден', { phoneNumber });
//         throw new Error('Пользователь не найден');
//     }
//
//     if (user.verificationCode !== verificationCode) {
//         logger.warn('confirmLoginService: Неверный код верификации', { phoneNumber, verificationCode });
//         throw new Error('Неверный код верификации');
//     }
//
//     user.isPhoneVerified = true;
//     user.verificationCode = null; // Очистка кода после подтверждения
//     await user.save();
//     logger.info('confirmLoginService: Пользователь подтверждён', { phoneNumber });
//
//     // Генерация JWT-токена
//     const token = jwt.sign(
//         { userId: user.id, phoneNumber: user.phoneNumber, role: user.role },
//         process.env.JWT_SECRET || 'your_jwt_secret',
//         { expiresIn: '1h' }
//     );
//
//     logger.info('confirmLoginService: JWT-токен сгенерирован', { token });
//
//     return token;
// };
//
// export const loginOrRegisterService = async ({ phoneNumber }) => {
//     logger.info('loginOrRegisterPassengerService: Начало обработки логина или регистрации', { phoneNumber });
//
//     // Поиск пользователя в таблице пользователей
//     let user = await User.findOne({ where: { phoneNumber } });
//     const now = new Date();
//     let created = false;
//
//     if (!user) {
//         logger.info('loginOrRegisterPassengerService: Пользователь не найден, создаем нового пассажира', { phoneNumber });
//
//         // Создание нового пассажира
//         const verificationCode = generateVerificationCode();
//         logger.info('loginOrRegisterPassengerService: Сгенерирован код верификации', { verificationCode });
//
//         user = await User.create({
//             phoneNumber,
//             role: 'passenger',
//             isApproved: true,
//             isPhoneVerified: false,
//             verificationCode,
//             lastSmsSentAt: now,
//         });
//         logger.info('loginOrRegisterPassengerService: Пользователь создан', { user });
//
//         created = true;
//
//         // Отправка кода верификации
//         await sendVerificationCode(phoneNumber, verificationCode);
//         logger.info('loginOrRegisterPassengerService: Код верификации отправлен', { phoneNumber, verificationCode });
//     } else {
//         logger.info('loginOrRegisterPassengerService: Пользователь найден, проверка интервала отправки SMS', { phoneNumber });
//
//         // Проверка интервала между отправками SMS
//         if (user.lastSmsSentAt && now - user.lastSmsSentAt < SMS_SEND_INTERVAL_MS) {
//             const remainingTime = Math.ceil((SMS_SEND_INTERVAL_MS - (now - user.lastSmsSentAt)) / 1000);
//             logger.warn('loginOrRegisterPassengerService: Слишком частая отправка SMS', { phoneNumber, remainingTime });
//             throw new Error(`Подождите ${remainingTime} секунд перед повторной отправкой SMS`);
//         }
//
//         if (!user.isApproved) {
//             logger.warn('loginOrRegisterPassengerService: Пользователь ещё не подтверждён', { phoneNumber });
//             throw new Error('Пользователь ещё не подтверждён');
//         }
//
//         const verificationCode = generateVerificationCode();
//         logger.info('loginOrRegisterPassengerService: Сгенерирован новый код верификации', { verificationCode });
//
//         user.verificationCode = verificationCode;
//         user.lastSmsSentAt = now;
//         await user.save();
//         logger.info('loginOrRegisterPassengerService: Обновлён код верификации в базе данных', { phoneNumber, verificationCode });
//
//         // Отправка кода верификации
//         await sendVerificationCode(phoneNumber, verificationCode);
//         logger.info('loginOrRegisterPassengerService: Код верификации отправлен', { phoneNumber, verificationCode });
//     }
//
//     return { created };
// };
//
//
// export const loginAdminService = async ({ username, password }) => {
//     logger.info('loginAdminService: Начало входа администратора', { username });
//
//     // Поиск администратора по имени
//     const admin = await Admin.findOne({ where: { username } });
//
//     if (!admin) {
//         logger.warn('loginAdminService: Администратор с таким ником не найден', { username });
//         throw new Error('Неверный ник или пароль');
//     }
//
//     // Проверка пароля
//     const isPasswordValid = await bcrypt.compare(password, admin.password);
//     if (!isPasswordValid) {
//         logger.warn('loginAdminService: Неверный пароль', { username });
//         throw new Error('Неверный ник или пароль');
//     }
//
//     // Генерация JWT
//     const token = jwt.sign(
//         {
//             adminId: admin.id,
//             username: admin.username,
//             role: admin.role,
//             city: admin.city,
//         },
//         process.env.JWT_SECRET || 'your_jwt_secret',
//         { expiresIn: '2h' }
//     );
//
//     logger.info('loginAdminService: Успешный вход администратора', { username, role: admin.role });
//
//     return { token, role: admin.role, city: admin.city };
// };
//
// export const createAdminService = async ({ username, password, role, city }) => {
//     logger.info('createAdminService: Создание администратора', { username });
//
//     // Проверка уникальности имени
//     const existingAdmin = await Admin.findOne({ where: { username } });
//     if (existingAdmin) {
//         logger.warn('createAdminService: Ник уже используется', { username });
//         throw new Error('Ник уже используется');
//     }
//
//     // Хэширование пароля
//     const hashedPassword = await bcrypt.hash(password, 10);
//
//     // Создание администратора
//     const admin = await Admin.create({
//         username,
//         password: hashedPassword,
//         role,
//         city,
//     });
//
//     logger.info('createAdminService: Администратор создан', { username, role });
//
//     return admin;
// };