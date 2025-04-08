import swaggerJsdoc from 'swagger-jsdoc';

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Balance Service API',
            version: '1.0.0',
            description: 'API документация для сервиса управления балансом',
            contact: {
                name: 'API Support',
                email: 'support@example.com'
            }
        },
        servers: [
            {
                url: process.env.API_URL || 'http://localhost:3000',
                description: 'API сервер'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                }
            }
        },
        security: [{
            bearerAuth: []
        }],
        tags: [
            {
                name: 'Balance',
                description: 'Операции с балансом'
            }
        ]
    },
    apis: ['./routes/*.js'], // Путь к файлам с маршрутами
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
