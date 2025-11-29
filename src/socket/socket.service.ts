import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import config from '../config';
import { logger } from '../utils/logger';

let io: Server;

export const initSocket = (httpServer: HttpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost:3000',
            credentials: true
        },
    });

    // Authentication middleware
    io.use((socket: Socket, next) => {
        try {
            let token = socket.handshake.auth.token || socket.handshake.query.token as string;

            if (!token) {
                const cookies = socket.handshake.headers.cookie;
                if (cookies) {
                    const tokenCookie = cookies.split(';').find(c => c.trim().startsWith('token='));
                    if (tokenCookie) {
                        token = tokenCookie.split('=')[1];
                    }
                }
            }

            if (!token) {
                return next(new Error('Authentication required'));
            }

            const decoded = jwt.verify(token, config.auth.jwtSecret) as { id: string; role: string };
            socket.data.userId = decoded.id;
            socket.data.role = decoded.role;

            socket.join(decoded.id);

            logger.info(`Socket connected: User ${decoded.id}`);
            next();
        } catch (err) {
            const error = err as Error;
            logger.error('Socket authentication failed:', error.message);
            next(new Error('Invalid authentication token'));
        }
    });

    io.on('connection', (socket) => {
        const userId = socket.data.userId;
        logger.info(`User connected via Socket.io: ${userId}`);

        socket.on('ping', () => {
            socket.emit('pong', { timestamp: Date.now() });
        });

        socket.on('disconnect', () => {
            logger.info(`User disconnected: ${userId}`);
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};

export const emitToUser = (userId: string, event: string, data: unknown) => {
    if (io) {
        io.to(userId).emit(event, data);
        logger.debug(`Event '${event}' emitted to user ${userId}`);
    } else {
        logger.warn('Socket.io not initialized, cannot emit event');
    }
};
