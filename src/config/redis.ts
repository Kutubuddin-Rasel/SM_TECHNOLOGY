import { createClient } from 'redis';
import config from './index';
import { logger } from '../utils/logger';

const redisClient = createClient({
    url: config.redis.url
});

redisClient.on('error', (err) => {
    logger.error('Redis Client Error:', err);
});


redisClient.on('connect', () => {
    logger.info('Redis connected successfully');
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
