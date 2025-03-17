import { Router } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();
console.log(process.env.AUTH_SERVICE_URL);


router.use('/auth', createProxyMiddleware({
    target: process.env.AUTH_SERVICE_URL,
    changeOrigin: true,
    timeout: 60000,
    pathRewrite: {
        '^/auth': '',
    },
    proxyTimeout: 60000,
    onProxyReq: (proxyReq, req, res) => {
        console.log(`Проксируем запрос: ${req.method} ${req.originalUrl}`);
    },
    onProxyRes: (proxyRes, req, res) => {
        console.log(`Получен ответ от auth-service: ${proxyRes.statusCode}`);
    },
    onError: (err, req, res) => {
        console.error('Ошибка проксирования запроса:', err);
        res.status(502).json({ error: 'Не удалось проксировать запрос' });
    }
}));

router.use('/chats', createProxyMiddleware({
    target: process.env.CHAT_SERVICE_URL,
    changeOrigin: true,
    timeout: 60000,
    pathRewrite: {
        '^/chats': '/chats',
    },
    proxyTimeout: 60000,
    onProxyReq: (proxyReq, req, res) => {
        console.log(`Проксируем запрос: ${req.method} ${req.originalUrl}`);
    },
    onProxyRes: (proxyRes, req, res) => {
        console.log(`Получен ответ от auth-service: ${proxyRes.statusCode}`);
    },
    onError: (err, req, res) => {
        console.error('Ошибка проксирования запроса:', err);
        res.status(502).json({ error: 'Не удалось проксировать запрос' });
    }
}));

router.use('/geo', createProxyMiddleware({
    target: process.env.GEO_SERVICE_URL,
    changeOrigin: true,
    timeout: 60000,
    pathRewrite: {
        '^/geo': '',
    },
    proxyTimeout: 60000,
    onProxyReq: (proxyReq, req, res) => {
        console.log(`Проксируем запрос: ${req.method} ${req.originalUrl}`);
    },
    onProxyRes: (proxyRes, req, res) => {
        console.log(`Получен ответ от geo-service: ${proxyRes.statusCode}`);
    },
    onError: (err, req, res) => {
        console.error('Ошибка проксирования запроса:', err);
        res.status(502).json({ error: 'Не удалось проксировать запрос' });
    }
}));

router.use('/rides', createProxyMiddleware({
    target: process.env.RIDE_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: {
        '^/rides': '/rides',
    },
    ws: true,
    logLevel: 'debug'
}));

router.use('/admin', createProxyMiddleware({
    target: process.env.ADMIN_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: {
        '^/admin': '',
    },
}));

// router.use('/balance', createProxyMiddleware({
//     target: process.env.BALANCE_SERVICE_URL,
//     changeOrigin: true,
//     pathRewrite: {
//         '^/balance': '',
//     },
// }));
//
// router.use('/geo', createProxyMiddleware({
//     target: process.env.GEO_SERVICE_URL,
//     changeOrigin: true,
//     pathRewrite: {
//         '^/geo': '',
//     },
// }));
//
router.use('/review', createProxyMiddleware({
    target: process.env.REVIEW_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: {
        '^/review': '',
    },
}));
//
// router.use('/sms', createProxyMiddleware({
//     target: process.env.SMS_SERVICE_URL,
//     changeOrigin: true,
//     pathRewrite: {
//         '^/sms': '',
//     },
// }));
// router.use('/payments', createProxyMiddleware({
//     target: process.env.PAYMENT_SERVICE_URL,
//     changeOrigin: true,
//     pathRewrite: {
//         '^/payments': '',
//     },
// }));

router.use('/uploads', createProxyMiddleware({
    target: process.env.AUTH_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: {
        '^/uploads': 'uploads',
    },
}));

export default router;

