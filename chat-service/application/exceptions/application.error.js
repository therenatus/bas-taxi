export class ApplicationError extends Error {
    constructor(message, code = 'APPLICATION_ERROR', status = 400) {
        super(message);
        this.name = 'ApplicationError';
        this.code = code;
        this.status = status;
    }

    static handle(error, response) {
        if (error instanceof ApplicationError) {
            return response.status(error.status).json({
                error: {
                    code: error.code,
                    message: error.message
                }
            });
        }
        response.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Internal server error'
            }
        });
    }
}