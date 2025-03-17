import { ApiClient } from "./api.client.js";

export class PassengerClient extends ApiClient {
    constructor({ baseURL }) {
        super({
            baseURL,
            serviceName: "auth"
        });
    }
}