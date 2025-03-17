import { ApiClient } from "./api.client.js";

export class AdminClient extends ApiClient {
    constructor({ baseURL }) {
        super({
            baseURL,
            serviceName: "auth"
        });
    }
}