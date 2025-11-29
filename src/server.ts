import http from 'http';
import app from './app';
import { initSocket } from './socket/socket.service';
import { connectRedis } from './config/redis';
import config from './config';
import { logger } from './utils/logger';

const server = http.createServer(app);

initSocket(server);

connectRedis().catch((err) => {
    logger.warn('Redis connection failed, using in-memory fallback:', err.message);
});

server.listen(config.port, () => {
    logger.info(`Server running on port ${config.port}`);
    logger.info(`Environment: ${config.nodeEnv}`);
});
