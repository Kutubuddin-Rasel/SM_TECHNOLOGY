import { doubleCsrf } from 'csrf-csrf';
import { Request } from 'express';
import config from '../config';

const csrfProtectionInstance = doubleCsrf({
    getSecret: () => config.auth.jwtSecret,
    cookieName: 'csrf-token',
    cookieOptions: {
        httpOnly: true,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
    },
    size: 64,
    ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
    getSessionIdentifier: (req: Request) => {
        return req.cookies?.token || req.ip || 'anonymous';
    },
});

export const csrfProtection = csrfProtectionInstance.doubleCsrfProtection;
export const generateCsrfToken = csrfProtectionInstance.generateCsrfToken;
export const csrfError = csrfProtectionInstance.invalidCsrfTokenError;
