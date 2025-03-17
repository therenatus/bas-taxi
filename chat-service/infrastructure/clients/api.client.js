// infrastructure/clients/ApiClient.js (базовый класс)
import axios from "axios";

export class ApiClient {
    constructor({ baseURL, serviceName }) {
        this.client = axios.create({
            baseURL: `${baseURL}/${serviceName}`,
            headers: {
                "Content-Type": "application/json",
                // Добавьте токен, если требуется аутентификация
                // Authorization: `Bearer ${process.env.API_GATEWAY_TOKEN}`
            },
        });
    }

    async get(url) {
        try {
            const response = await this.client.get(url);
            return { data: response.data };
        } catch (error) {
            throw new Error(`API request failed: ${error.message}`);
        }
    }

    async post(url, data) {
        try {
            const response = await this.client.post(url, data);
            return { data: response.data };
        } catch (error) {
            throw new Error(`API POST request failed: ${error.message}`);
        }
    }


    async search(criteria) {
        try {
            const response = await this.client.get("/search", { params: criteria });
            return response.data;
        } catch (error) {
            throw new Error(`Search failed: ${error.message}`);
        }
    }
}