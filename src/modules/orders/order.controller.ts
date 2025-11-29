import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import * as orderService from './order.service';
import { z } from 'zod';

const createOrderSchema = z.object({
    items: z.array(
        z.object({
            title: z.string(),
            price: z.number().positive(),
            quantity: z.number().int().positive(),
        })
    ),
    paymentMethod: z.enum(['stripe', 'paypal']),
});

export const createOrder = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const data = createOrderSchema.parse(req.body);
        const result = await orderService.createOrder({ userId, ...data });
        res.status(201).json(result);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};

export const updateStatus = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { orderStatus } = req.body;

        if (!['pending', 'processing', 'shipped', 'delivered'].includes(orderStatus)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const order = await orderService.updateOrderStatus(id, orderStatus);

        const { emitToUser } = await import('../../socket/socket.service');
        emitToUser(order.userId, 'orderUpdate', {
            orderId: order.id,
            orderStatus: orderStatus,
            paymentStatus: order.paymentStatus
        });

        res.json(order);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};
