import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../../utils/prisma';
import config from '../../config';
import { RegisterDto, LoginDto } from './auth.dto';
import { parseDuration } from '../../utils/time';

const generateTokens = async (userId: string, role: string) => {
    const accessToken = jwt.sign({ id: userId, role }, config.auth.jwtSecret, {
        expiresIn: config.auth.jwtExpiresIn,
    });

    const refreshToken = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date(Date.now() + parseDuration(config.auth.refreshExpiresIn));

    await prisma.refreshToken.create({
        data: {
            token: refreshToken,
            userId,
            expiresAt,
        },
    });

    return { accessToken, refreshToken };
};

export const register = async (data: RegisterDto) => {
    const existingUser = await prisma.user.findUnique({
        where: { email: data.email },
    });

    if (existingUser) {
        throw new Error('User already exists');
    }

    const hashedPassword = await bcrypt.hash(data.password, config.auth.bcryptSaltRounds);

    const user = await prisma.user.create({
        data: {
            email: data.email,
            password: hashedPassword,
        },
    });

    const tokens = await generateTokens(user.id, user.role);

    return { user, ...tokens };
};

export const login = async (data: LoginDto) => {
    const user = await prisma.user.findUnique({
        where: { email: data.email },
    });

    if (!user) {
        throw new Error('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(data.password, user.password);

    if (!isPasswordValid) {
        throw new Error('Invalid credentials');
    }

    const tokens = await generateTokens(user.id, user.role);

    return { user, ...tokens };
};

export const refreshToken = async (token: string) => {
    const storedToken = await prisma.refreshToken.findUnique({
        where: { token },
        include: { user: true },
    });

    if (!storedToken || storedToken.revoked || storedToken.expiresAt < new Date()) {
        throw new Error('Invalid refresh token');
    }

    // Revoke old token (Rotation)
    await prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { revoked: true },
    });

    // Generate new pair
    const tokens = await generateTokens(storedToken.userId, storedToken.user.role);

    return { user: storedToken.user, ...tokens };
};

export const logout = async (token: string) => {
    await prisma.refreshToken.updateMany({
        where: { token },
        data: { revoked: true },
    });
};
