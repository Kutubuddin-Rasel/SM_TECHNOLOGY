import { Router } from 'express';
import * as orderController from './order.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { requirePermission, Permission } from '../../middlewares/rbac.middleware';

const router = Router();

router.post('/', authenticate, requirePermission(Permission.ORDERS_CREATE), orderController.createOrder);
router.patch('/:id/status', authenticate, requirePermission(Permission.ORDERS_UPDATE), orderController.updateStatus);

export default router;
