import { Router } from 'express';
import * as authController from './auth.controller';
import { authLimiter } from '../../middlewares/rateLimit.middleware';

const router = Router();

router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/logout', authController.logout);

export default router;
