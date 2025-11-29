import Stripe from 'stripe';
import config from '../../config';

const stripe = new Stripe(config.stripe.secretKey, {});

const createPayPalOrder = async (amount: number) => {
    return {
        id: 'mock_paypal_order_id',
        approvalUrl: 'https://www.sandbox.paypal.com/checkoutnow?token=mock_token',
    };
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
        const order = await createPayPalOrder(amount);
        return {
            approvalUrl: order.approvalUrl,
            paymentId: order.id,
        };
    } else {
        throw new Error('Invalid payment method');
    }
};
