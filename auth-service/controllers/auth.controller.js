// // controllers/authController.js
// import logger from '../utils/logger.js';
// import {
//     registerPassengerService,
//     registerDriverService,
//     loginService,
//     confirmLoginService, loginOrRegisterService
// } from '../services/auth.service.js';
// import {passengerRegisterSchema} from "../validators/register-passenger.validator.js";
// import {driverRegisterSchema} from "../validators/register-driver.validator.js";
// import {confirmLoginSchema, loginSchema} from "../validators/login.validator.js";
// import validateMiddleware from "../middlewares/validate.middleware.js";
//
//
// // Контроллер для регистрации пассажира
// export const registerPassenger = [
//     validateMiddleware(passengerRegisterSchema),
//     async (req, res) => {
//         logger.info('registerPassenger: Начало обработки запроса');
//         try {
//             const { phoneNumber } = req.body;
//             logger.info('registerPassenger: Получены данные', { phoneNumber });
//
//             await registerPassengerService({ phoneNumber       });
//             logger.info('registerPassenger: Регистрация пассажира завершена успешно');
//
//             res.status(201).json({ message: 'Пассажир успешно зарегистрирован. Проверьте SMS для подтверждения номера телефона.' });
//             logger.info('registerPassenger: Ответ отправлен клиенту');
//         } catch (error) {
//             logger.error('Ошибка при регистрации пассажира', { error: error.message });
//             res.status(400).json({ error: error.message });
//         }
//     },
// ];
//
// // Контроллер для регистрации водителя
// export const registerDriver = [
//     validateMiddleware(driverRegisterSchema),
//     async (req, res) => {
//         logger.info('registerDriver: Начало обработки запроса');
//         try {
//             const {
//                 phoneNumber,
//                 fullName,
//                 address,
//                 city,
//                 technicalPassport,
//                 carBrand,
//                 carModel,
//                 licensePlate,
//                 manufactureDate,
//                 vinCode,
//             } = req.body;
//
//             if (!req.files || Object.keys(req.files).length === 0) {
//                 throw new Error('Все необходимые фотографии должны быть загружены');
//             }
//
//             const {
//                 driversLicensePhoto,
//                 technicalPassportFrontPhoto,
//                 technicalPassportBackPhoto,
//                 identityDocumentFrontPhoto,
//                 identityDocumentWithHandsPhoto,
//                 carPhotoFront,
//                 carPhotoRight,
//                 carPhotoBack,
//                 carPhotoLeft,
//                 carPhotoFrontPassenger,
//                 carPhotoRearSeats,
//                 carPhotoOpenTrunk,
//             } = req.files;
//
//             await registerDriverService({
//                 phoneNumber,
//                 fullName,
//                 address,
//                 city,
//                 technicalPassport,
//                 carBrand,
//                 carModel,
//                 licensePlate,
//                 manufactureDate,
//                 vinCode,
//                 driversLicensePhoto: driversLicensePhoto[0].path,
//                 technicalPassportFrontPhoto: technicalPassportFrontPhoto[0].path,
//                 technicalPassportBackPhoto: technicalPassportBackPhoto[0].path,
//                 identityDocumentFrontPhoto: identityDocumentFrontPhoto[0].path,
//                 identityDocumentWithHandsPhoto: identityDocumentWithHandsPhoto[0].path,
//                 carPhotoFront: carPhotoFront[0].path,
//                 carPhotoRight: carPhotoRight[0].path,
//                 carPhotoBack: carPhotoBack[0].path,
//                 carPhotoLeft: carPhotoLeft[0].path,
//                 carPhotoFrontPassenger: carPhotoFrontPassenger[0].path,
//                 carPhotoRearSeats: carPhotoRearSeats[0].path,
//                 carPhotoOpenTrunk: carPhotoOpenTrunk[0].path,
//             });
//
//             logger.info('registerDriver: Регистрация водителя завершена успешно');
//
//             res.status(201).json({ message: 'Водитель успешно зарегистрирован. Проверьте SMS для подтверждения номера телефона.' });
//             logger.info('registerDriver: Ответ отправлен клиенту');
//         } catch (error) {
//             logger.error('Ошибка при регистрации водителя', { error: error.message });
//             res.status(400).json({ error: error.message });
//         }
//     },
// ];
//
// export const login = [
//     validateMiddleware(loginSchema),
//     async (req, res) => {
//         logger.info('login: Начало обработки запроса');
//         try {
//             const { phoneNumber } = req.body;
//             logger.info('login: Получены данные', { phoneNumber });
//
//             await loginService({ phoneNumber });
//             logger.info('login: Логин завершён успешно');
//
//             res.status(200).json({ message: 'Код верификации отправлен по SMS.' });
//             logger.info('login: Ответ отправлен клиенту');
//         } catch (error) {
//             logger.error('Ошибка при логине', { error: error.message });
//             res.status(400).json({ error: error.message });
//         }
//     },
// ];
//
// export const confirmLogin = [
//     validateMiddleware(confirmLoginSchema),
//     async (req, res) => {
//         logger.info('confirmLogin: Начало обработки запроса');
//         try {
//             const { phoneNumber, verificationCode } = req.body;
//             logger.info('confirmLogin: Получены данные', { phoneNumber, verificationCode });
//
//             const token = await confirmLoginService({ phoneNumber, verificationCode });
//             logger.info('confirmLogin: Подтверждение логина завершено успешно');
//
//             res.status(200).json({ token });
//             logger.info('confirmLogin: Ответ отправлен клиенту');
//         } catch (error) {
//             logger.error('Ошибка при подтверждении логина', { error: error.message });
//             res.status(400).json({ error: error.message });
//         }
//     },
// ];
//
// export const loginOrRegister = [
//     validateMiddleware(loginSchema),
//     async (req, res) => {
//         logger.info('loginOrRegister: Начало обработки запроса');
//         try {
//             const { phoneNumber, fullName } = req.body;
//             logger.info('loginOrRegister: Получены данные', { phoneNumber, fullName });
//
//             const result = await loginOrRegisterService({ phoneNumber, fullName });
//
//             if (result.created) {
//                 logger.info('loginOrRegister: Пользователь создан и код отправлен', { phoneNumber });
//                 res.status(201).json({ message: 'Пользователь создан. Код верификации отправлен по SMS.' });
//             } else {
//                 logger.info('loginOrRegister: Пользователь найден и код отправлен', { phoneNumber });
//                 res.status(200).json({ message: 'Код верификации отправлен по SMS.' });
//             }
//             logger.info('loginOrRegister: Ответ отправлен клиенту');
//         } catch (error) {
//             logger.error('Ошибка при логине или регистрации', { error: error.message });
//             res.status(400).json({ error: error.message });
//         }
//     },
// ];
