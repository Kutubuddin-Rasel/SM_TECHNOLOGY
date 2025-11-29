import { Request, Response } from 'express';
import * as authService from './auth.service';
import { RegisterDto, LoginDto } from './auth.dto';
import { parseDuration } from '../../utils/time';
import config from '../../config';


const setCookies = (res: Response, accessToken: string, refreshToken: string) => {
    res.cookie('token', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: parseDuration(config.auth.jwtExpiresIn as string)
    });

    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/api/auth/refresh',
        maxAge: parseDuration(config.auth.refreshExpiresIn)
    });
};

export const register = async (req: Request, res: Response) => {
    try {
        const data: RegisterDto = req.body;
        const { user, accessToken, refreshToken } = await authService.register(data);

        setCookies(res, accessToken, refreshToken);

        res.status(201).json({ user });
    } catch (error) {
        const err = error as Error;
        res.status(400).json({ error: err.message });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const data: LoginDto = req.body;
        const { user, accessToken, refreshToken } = await authService.login(data);

        setCookies(res, accessToken, refreshToken);

        res.json({ user });
    } catch (error) {
        const err = error as Error;
        res.status(400).json({ error: err.message });
    }
};

export const refresh = async (req: Request, res: Response) => {
    try {
        const token = req.cookies.refreshToken;
        if (!token) {
            return res.status(401).json({ error: 'Refresh token required' });
        }

        const { user, accessToken, refreshToken } = await authService.refreshToken(token);

        setCookies(res, accessToken, refreshToken);

        res.json({ user });
    } catch (error) {
        res.status(401).json({ error: 'Invalid refresh token' });
    }
};

export const logout = async (req: Request, res: Response) => {
    const token = req.cookies.refreshToken;
    if (token) {
        await authService.logout(token);
    }

    res.clearCookie('token');
    res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
    res.json({ message: 'Logged out successfully' });
};
