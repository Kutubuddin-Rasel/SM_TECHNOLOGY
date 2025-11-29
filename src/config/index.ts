import dotenv from 'dotenv';

dotenv.config();

const getJwtSecret = (): string => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET environment variable is required');
    }
    return secret;
};

const requiredEnvVars = [
    'DATABASE_URL',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'OPENROUTER_API_KEY'
];

for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        console.warn(`Warning: ${envVar} is not set in environment variables`);
    }
}

export const config = {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',

    database: {
        url: process.env.DATABASE_URL || '',
    },

    redis: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
    },

    auth: {
        jwtSecret: getJwtSecret(),
        jwtExpiresIn: '1d',
        bcryptSaltRounds: 10,
    },

    stripe: {
        secretKey: process.env.STRIPE_SECRET_KEY || '',
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    },

    paypal: {
        clientId: process.env.PAYPAL_CLIENT_ID || '',
        clientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
    },

    openrouter: {
        apiKey: process.env.OPENROUTER_API_KEY || '',
        model: 'x-ai/grok-4.1-fast:free',
        apiUrl: 'https://openrouter.ai/api/v1/chat/completions',
    },

    chat: {
        historyTTL: 86400,
        maxTokens: 150,
    },

    rateLimit: {
        general: { windowMs: 15 * 60 * 1000, max: 100 },
        auth: { windowMs: 15 * 60 * 1000, max: 5 },
        chatbot: { windowMs: 60 * 1000, max: 10 },
        orders: { windowMs: 60 * 1000, max: 20 },
    },
};

export default config;
