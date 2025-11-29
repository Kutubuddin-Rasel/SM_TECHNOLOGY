import { createClient } from 'redis';
import config from './index';

const redisClient = createClient({
    url: config.redis.url
});

redisClient.on('error', (err) => {
    console.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
    console.log('Redis connected successfully');
});

let isConnected = false;

export const connectRedis = async () => {
    if (!isConnected) {
        await redisClient.connect();
        isConnected = true;
    }
};

export const getRedisClient = () => {
    return isConnected ? redisClient : null;
};

export default redisClient;
