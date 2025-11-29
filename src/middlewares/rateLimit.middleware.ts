import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { getRedisClient } from '../config/redis';
import config from '../config';

const createRedisStore = () => {
    const client = getRedisClient();
    return client ? new RedisStore({ sendCommand: (...args: string[]) => client.sendCommand(args) }) : undefined;
};

export const generalLimiter = rateLimit({
    windowMs: config.rateLimit.general.windowMs,
    max: config.rateLimit.general.max,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    store: createRedisStore(),
});

export const authLimiter = rateLimit({
    windowMs: config.rateLimit.auth.windowMs,
    max: config.rateLimit.auth.max,
    message: 'Too many authentication attempts, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    store: createRedisStore(),
});

export const chatbotLimiter = rateLimit({
    windowMs: config.rateLimit.chatbot.windowMs,
    max: config.rateLimit.chatbot.max,
    message: 'Too many chatbot requests, please slow down.',
    standardHeaders: true,
    legacyHeaders: false,
    store: createRedisStore(),
});

export const orderLimiter = rateLimit({
    windowMs: config.rateLimit.orders.windowMs,
    max: config.rateLimit.orders.max,
    message: 'Too many order requests, please try again shortly.',
    standardHeaders: true,
    legacyHeaders: false,
    store: createRedisStore(),
});
