import Stripe from 'stripe';
import paypal from '@paypal/checkout-server-sdk';
import config from '../../config';
import { logger } from '../../utils/logger';

const stripe = new Stripe(config.stripe.secretKey, {});

const getPayPalClient = () => {
    const environment = config.paypal.mode === 'live'
        ? new paypal.core.LiveEnvironment(config.paypal.clientId, config.paypal.clientSecret)
        : new paypal.core.SandboxEnvironment(config.paypal.clientId, config.paypal.clientSecret);

    return new paypal.core.PayPalHttpClient(environment);
};

export const createPayPalOrder = async (amount: number, orderId: string) => {
    const client = getPayPalClient();
    const request = new paypal.orders.OrdersCreateRequest();

    request.prefer("return=representation");
    request.requestBody({
        intent: 'CAPTURE',
        purchase_units: [{
            amount: {
                currency_code: 'USD',
                value: amount.toFixed(2)
            },
            custom_id: orderId
        }],
        application_context: {
            brand_name: 'SM Technology',
            landing_page: 'NO_PREFERENCE',
            user_action: 'PAY_NOW',
            return_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/success`,
            cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/cancel`
        }
    });

    try {
        const response = await client.execute(request);
        const approvalLink = response.result.links?.find((link: { rel: string }) => link.rel === 'approve');

        return {
            id: response.result.id,
            approvalUrl: approvalLink?.href || ''
        };
    } catch (error) {
        const err = error as Error;
        logger.error('PayPal order creation failed:', err.message);
        throw new Error('Failed to create PayPal order');
    }
};

export const initiatePayment = async (amount: number, paymentMethod: string, orderId: string) => {
    if (paymentMethod === 'stripe') {
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100),
            currency: 'usd',
            metadata: { orderId },
        });
        return {
            clientSecret: paymentIntent.client_secret,
            paymentId: paymentIntent.id,
        };
    } else if (paymentMethod === 'paypal') {
        const order = await createPayPalOrder(amount, orderId);
        return {
            approvalUrl: order.approvalUrl,
            paymentId: order.id,
        };
    } else {
        throw new Error('Invalid payment method');
    }
};
