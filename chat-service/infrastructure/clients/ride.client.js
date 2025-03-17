import { ApiClient } from "./api.client.js";

export class RideClient extends ApiClient {
    constructor({ baseURL }) {
        super({
            baseURL,
            serviceName: "rides"
        });
    }
}