// infrastructure/clients/DriverClient.js
import { ApiClient } from "./api.client.js";

export class DriverClient extends ApiClient {
    constructor({ baseURL }) {
        super({
            baseURL,
            serviceName: "auth" // Эндпоинт API-шлюза для водителей
        });
    }
}
