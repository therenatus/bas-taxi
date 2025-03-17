import Redis from 'ioredis';

export class CacheService {
    constructor() {
        this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    }

    async get(key) {
        const data = await this.redis.get(key);
        return data ? JSON.parse(data) : null;
    }

    async set(key, value, ttl = 300) {
        await this.redis.set(key, JSON.stringify(value), 'EX', ttl);
    }

    async delete(key) {
        await this.redis.del(key);
    }

    async deletePattern(pattern) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
            await this.redis.del(...keys);
        }
    }
}