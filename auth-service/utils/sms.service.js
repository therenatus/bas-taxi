import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const SMS_API_URL = process.env.SMS_API_URL;
const SMS_API_KEY = process.env.SMS_API_KEY;

export const sendVerificationCode = async (phoneNumber, code) => {
    const message = `Ecomdevs, Ваш код верификации: ${code}`;
    const url = `https://smsc.kz/sys/send.php?login=nianatoliy87&psw=nmnmnm888Ni@&phones=${phoneNumber}&mes=${message}`;

    try {
        // await axios.post(SMS_API_URL, {
        //     apiKey: SMS_API_KEY,
        //     to: phoneNumber,
        //     message,
        // });
        const data = await axios.get(url);
        console.log(data);
    } catch (error) {
        throw new Error('Ошибка при отправке SMS');
    }
};
