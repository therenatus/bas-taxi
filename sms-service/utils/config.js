import dotenv from 'dotenv';

dotenv.config();

export default {
    port: process.env.PORT || 3000,
    smsc: {
        login: process.env.SMSC_LOGIN,
        password: process.env.SMSC_PASSWORD,
        ssl: process.env.SMSC_SSL === 'false',
        charset: process.env.SMSC_CHARSET || 'utf-8',
        host: process.env.SMSC_HOST || 'api.smsc.kz',
        def_fmt: 3 // формат SMS, может быть изменен в зависимости от требований
    },
    rabbitmq: {
        url: process.env.RABBITMQ_URL
    }
};
