import prisma from '../../utils/prisma';
import * as paymentService from '../payment/payment.service';

interface CreateOrderDto {
    userId: string;
    items: { title: string; price: number; quantity: number }[];
    paymentMethod: 'stripe' | 'paypal';
}

export const createOrder = async (data: CreateOrderDto) => {
    const totalAmount = data.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const order = await prisma.order.create({
        data: {
            userId: data.userId,
            totalAmount,
            paymentMethod: data.paymentMethod,
            items: {
                create: data.items.map((item) => ({
                    title: item.title,
                    price: item.price,
                    quantity: item.quantity,
                })),
            },
        },
        include: { items: true },
    });

    const paymentResponse = await paymentService.initiatePayment(totalAmount, data.paymentMethod, order.id);

    return { order, payment: paymentResponse };
};

export const updateOrderStatus = async (orderId: string, status: string) => {
    return prisma.order.update({
        where: { id: orderId },
        data: { orderStatus: status },
    });
};

export const updatePaymentStatus = async (orderId: string, status: string) => {
    return prisma.order.update({
        where: { id: orderId },
        data: { paymentStatus: status },
    });
};
