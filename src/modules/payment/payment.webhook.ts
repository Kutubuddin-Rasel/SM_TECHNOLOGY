import { Request, Response } from 'express';
import Stripe from 'stripe';
import prisma from '../../utils/prisma';
import { emitToUser } from '../../socket/socket.service';
import config from '../../config';

const stripe = new Stripe(config.stripe.secretKey, {});

export const stripeWebhook = async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'];
    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig as string,
            config.stripe.webhookSecret
        );
    } catch (err: any) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const orderId = paymentIntent.metadata.orderId;

        if (orderId) {
            await prisma.order.update({
                where: { id: orderId },
                data: {
                    paymentStatus: 'paid',
                    orderStatus: 'processing',
                },
            });

            const order = await prisma.order.findUnique({ where: { id: orderId } });
            if (order) {
                emitToUser(order.userId, 'orderUpdate', { orderId, paymentStatus: 'paid', orderStatus: 'processing' });
            }
        }
    }

    res.json({ received: true });
};

export const paypalWebhook = async (req: Request, res: Response) => {
    const event = req.body;

    if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
        const orderId = event.resource.custom_id;

        if (orderId) {
            await prisma.order.update({
                where: { id: orderId },
                data: {
                    paymentStatus: 'paid',
                    orderStatus: 'processing',
                },
            });

            const order = await prisma.order.findUnique({ where: { id: orderId } });
            if (order) {
                emitToUser(order.userId, 'orderUpdate', { orderId, paymentStatus: 'paid', orderStatus: 'processing' });
            }
        }
    }

    res.json({ received: true });
};
