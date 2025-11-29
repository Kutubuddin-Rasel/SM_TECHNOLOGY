import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';

export enum Role {
    GUEST = 'guest',
    USER = 'user',
    ADMIN = 'admin',
    SUPER_ADMIN = 'super_admin'
}

export enum Permission {
    ORDERS_CREATE = 'orders:create',
    ORDERS_READ = 'orders:read',
    ORDERS_UPDATE = 'orders:update',
    ORDERS_DELETE = 'orders:delete',
    CHAT_ACCESS = 'chat:access',
}

const rolePermissions: Record<Role, Permission[]> = {
    [Role.GUEST]: [],
    [Role.USER]: [
        Permission.ORDERS_CREATE,
        Permission.ORDERS_READ,
        Permission.CHAT_ACCESS,
    ],
    [Role.ADMIN]: [
        Permission.ORDERS_CREATE,
        Permission.ORDERS_READ,
        Permission.ORDERS_UPDATE,
        Permission.CHAT_ACCESS,
    ],
    [Role.SUPER_ADMIN]: [
        Permission.ORDERS_CREATE,
        Permission.ORDERS_READ,
        Permission.ORDERS_UPDATE,
        Permission.ORDERS_DELETE,
        Permission.CHAT_ACCESS,
    ],
};

const hasPermission = (role: string, permission: Permission): boolean => {
    const permissions = rolePermissions[role as Role] || [];
    return permissions.includes(permission);
};

export const requireRole = (...allowedRoles: Role[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (!allowedRoles.includes(req.user.role as Role)) {
            return res.status(403).json({
                error: 'Insufficient permissions',
                required: allowedRoles,
                current: req.user.role
            });
        }

        next();
    };
};

export const requirePermission = (permission: Permission) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (!hasPermission(req.user.role, permission)) {
            return res.status(403).json({
                error: 'Insufficient permissions',
                required: permission,
                role: req.user.role
            });
        }

        next();
    };
};

export const authorizeAdmin = requireRole(Role.ADMIN, Role.SUPER_ADMIN);
