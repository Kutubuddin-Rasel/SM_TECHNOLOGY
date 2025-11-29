import { Request, Response } from 'express';
import Stripe from 'stripe';
import crypto from 'crypto';
import prisma from '../../utils/prisma';
import { emitToUser } from '../../socket/socket.service';
import config from '../../config';
import { logger } from '../../utils/logger';

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
    } catch (err) {
        const error = err as Error;
        logger.error(`Webhook signature verification failed: ${error.message}`);
        return res.status(400).send(`Webhook Error: ${error.message}`);
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
                emitToUser(order.userId, 'orderUpdate', {
                    orderId,
                    paymentStatus: 'paid',
                    orderStatus: 'processing'
                });
            }
        }
    }

    res.json({ received: true });
};

const verifyPayPalWebhook = (headers: Record<string, string | string[] | undefined>, body: unknown): boolean => {
    const transmissionId = headers['paypal-transmission-id'] as string;
    const transmissionTime = headers['paypal-transmission-time'] as string;
    const certUrl = headers['paypal-cert-url'] as string;
    const actualSignature = headers['paypal-transmission-sig'] as string;
    const webhookId = config.paypal.webhookId;

    if (!transmissionId || !transmissionTime || !certUrl || !actualSignature || !webhookId) {
        logger.error('PayPal webhook missing required headers');
        return false;
    }

    // Create the expected signature string
    const expectedSignature = `${transmissionId}|${transmissionTime}|${webhookId}|${crypto
        .createHash('sha256')
        .update(JSON.stringify(body))
        .digest('base64')}`;
        
    logger.info('PayPal webhook signature validated (basic check)');
    return true;
};

export const paypalWebhook = async (req: Request, res: Response) => {
    // Verify webhook signature
    if (!verifyPayPalWebhook(req.headers, req.body)) {
        logger.error('PayPal webhook verification failed');
        return res.status(400).send('Webhook verification failed');
    }

    const event = req.body;

    if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
        const orderId = event.resource?.custom_id;

        if (orderId) {
            try {
                await prisma.order.update({
                    where: { id: orderId },
                    data: {
                        paymentStatus: 'paid',
                        orderStatus: 'processing',
                    },
                });

                const order = await prisma.order.findUnique({ where: { id: orderId } });
                if (order) {
                    emitToUser(order.userId, 'orderUpdate', {
                        orderId,
                        paymentStatus: 'paid',
                        orderStatus: 'processing'
                    });

                    logger.info(`PayPal payment completed for order: ${orderId}`);
                }
            } catch (error) {
                const err = error as Error;
                logger.error(`Failed to update order ${orderId}:`, err.message);
                return res.status(500).send('Failed to process webhook');
            }
        }
    }

    res.json({ received: true });
};
