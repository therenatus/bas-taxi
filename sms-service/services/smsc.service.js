import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import config from '../utils/config.js';
import logger from '../utils/logger.js';

class SmscService {
    constructor() {
        this.ssl = config.smsc.ssl;
        this.login = config.smsc.login;
        this.password = config.smsc.password;
        this.charset = config.smsc.charset;
        this.def_fmt = config.smsc.def_fmt;
        this.host = config.smsc.host;
    }

    getHost(www = '') {
        return `${this.ssl ? 'https://' : 'http://'}${www}${this.host}/sys/`;
    }

    async sendRequest(file, data, retries = 5, www = '') {
        const url = `${this.getHost(www)}${file}`;
        const form = new FormData();

        form.append('fmt', this.def_fmt);

        if (this.login) {
            form.append('login', this.login);
            form.append('psw', this.password);
        } else {
            form.append('apikey', this.password);
        }

        form.append('charset', this.charset);

        if (data.type) {
            form.append(data.type, 1);
        }

        if (data.data) {
            this.convertData(data.data);
            if (data.data.files) {
                this.convertFiles(form, data.data.files);
            }

            for (const key in data.data) {
                if (Object.hasOwnProperty.call(data.data, key)) {
                    form.append(key, data.data[key]);
                }
            }
        }

        try {
            const response = await axios.post(url, form, {
                headers: form.getHeaders(),
                timeout: 10000
            });
            return response.data;
        } catch (error) {
            if (retries > 0) {
                const newWww = www.startsWith('www') ? `www${retries}` : 'www';
                logger.warn(`Ошибка при отправке запроса. Повторная попытка ${retries} раз: ${error.message}`);
                return this.sendRequest(file, data, retries - 1, newWww);
            } else {
                logger.error('Достигнуто максимальное количество попыток отправки запроса');
                throw new Error('Connection Error');
            }
        }
    }

    convertData(data) {
        if (data.fmt) delete data.fmt;
        if (data.msg) {
            data.mes = data.msg;
            delete data.msg;
        }
        if (data.message) {
            data.mes = data.message;
            delete data.message;
        }
        if (data.phone) {
            data.phones = Array.isArray(data.phone) ? data.phone.join(',') : data.phone;
            delete data.phone;
        }
        if (data.number) {
            data.phones = Array.isArray(data.number) ? data.number.join(',') : data.number;
            delete data.number;
        }

        if (data.list) {
            let listStr = '';
            for (const [key, value] of Object.entries(data.list)) {
                listStr += `${key}:${value}\n`;
            }
            data.list = listStr;
            delete data.mes;
        }
    }

    convertFiles(form, files) {
        if (typeof files === 'string') {
            const fileContent = fs.readFileSync(files);
            form.append('files', fileContent, { filename: files });
            return;
        }

        if (Array.isArray(files)) {
            files.forEach((file, index) => {
                const fileContent = fs.readFileSync(file);
                form.append(`files[${index}]`, fileContent, { filename: file });
            });
        } else {
            for (const key in files) {
                if (Object.hasOwnProperty.call(files, key)) {
                    const fileContent = fs.readFileSync(files[key]);
                    form.append(key, fileContent, { filename: files[key] });
                }
            }
        }
    }

    async sendSms(data) {
        try {
            const response = await this.sendRequest('send.php', { data });
            return response;
        } catch (error) {
            logger.error('Ошибка при отправке SMS:', error.message);
            throw error;
        }
    }

    async sendMail(data) {
        try {
            const response = await this.sendRequest('send.php', { type: 'mail', data });
            return response;
        } catch (error) {
            logger.error('Ошибка при отправке e-mail:', error.message);
            throw error;
        }
    }

    async sendMms(data) {
        try {
            const response = await this.sendRequest('send.php', { type: 'mms', data });
            return response;
        } catch (error) {
            logger.error('Ошибка при отправке MMS:', error.message);
            throw error;
        }
    }

    async getBalance() {
        try {
            const response = await this.sendRequest('balance.php', { data: { cur: 1 } });
            return response.balance;
        } catch (error) {
            logger.error('Ошибка при получении баланса:', error.message);
            throw error;
        }
    }

    async getStatus(data) {
        try {
            const response = await this.sendRequest('status.php', { data });
            return response;
        } catch (error) {
            logger.error('Ошибка при получении статуса сообщения:', error.message);
            throw error;
        }
    }

    async getSmsCost(data) {
        try {
            const response = await this.sendRequest('send.php', { data });
            return response.cost;
        } catch (error) {
            logger.error('Ошибка при получении стоимости SMS:', error.message);
            throw error;
        }
    }

    async raw(file, data) {
        try {
            const response = await this.sendRequest(file, { data });
            return response;
        } catch (error) {
            logger.error('Ошибка при выполнении RAW запроса:', error.message);
            throw error;
        }
    }

    async testConnection() {
        try {
            const balance = await this.getBalance();
            return balance;
        } catch (error) {
            logger.error('Ошибка при тестировании подключения:', error);
            throw error;
        }
    }
}

export default new SmscService();
