import http from 'http';
import app from './app';
import { initSocket } from './socket/socket.service';
import { connectRedis } from './config/redis';
import config from './config';

const server = http.createServer(app);

initSocket(server);

connectRedis().catch((err) => {
    console.warn('Redis connection failed, using in-memory fallback:', err.message);
});

server.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
    console.log(`Environment: ${config.nodeEnv}`);
});
