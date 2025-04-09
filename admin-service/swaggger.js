// utils/swagger.js
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import path from 'path';
import { fileURLToPath } from 'url';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Определение опций для swagger-jsdoc
const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Admin Service API',
            version: '1.0.0',
            description: 'Документация для ADMIN Service',
        },

        components: {
            securitySchemes: {
                BearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
        // Глобальное требование авторизации для всех маршрутов
        // Каждый маршрут может переопределить это свойство
        security: [{
            BearerAuth: []
        }],
    },
    // Путь к файлам, содержащим аннотации Swagger
    apis: [path.join(__dirname, './routes/*.js')],
};

const swaggerSpec = swaggerJSDoc(options);

const setupSwagger = (app) => {
    // Опции для настройки Swagger UI
    const swaggerUiOptions = {
        explorer: true,
        swaggerOptions: {
            // Отключаем требование авторизации для UI (не влияет на API)
            persistAuthorization: true,
        }
    };
    
    // Добавляем middleware, которое пропускает запросы к Swagger UI без проверки авторизации
    app.use('/api-docs', (req, res, next) => {
        // Исключаем требование токена для документации
        next();
    });
    
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));
};

export default setupSwagger;
