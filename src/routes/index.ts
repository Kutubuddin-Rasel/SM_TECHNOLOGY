import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import orderRoutes from '../modules/orders/order.routes';
import chatRoutes from '../modules/chat/chat.routes';
import paymentRoutes from '../modules/payment/payment.routes';
import csrfRoutes from './csrf.routes';
import { orderLimiter, chatbotLimiter } from '../middlewares/rateLimit.middleware';
import { csrfProtection } from '../middlewares/csrf.middleware';

const router = Router();

router.use('/csrf', csrfRoutes);
router.use('/auth', authRoutes);
router.use('/orders', csrfProtection, orderLimiter, orderRoutes);
router.use('/chatbot', csrfProtection, chatbotLimiter, chatRoutes);
router.use('/payments', paymentRoutes);

export default router;
