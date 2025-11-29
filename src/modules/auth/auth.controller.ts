import { Request, Response } from 'express';
import * as authService from './auth.service';
import { RegisterDto, LoginDto } from './auth.dto';

export const register = async (req: Request, res: Response) => {
    try {
        const data: RegisterDto = req.body;
        const { user, token } = await authService.register(data);

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000
        });

        res.status(201).json({ user });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const data: LoginDto = req.body;
        const { user, token } = await authService.login(data);

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000
        });

        res.json({ user });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};

export const logout = async (req: Request, res: Response) => {
    res.clearCookie('token');
    res.json({ message: 'Logged out successfully' });
};
