
import 'server-only';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export async function enqueueOrderConfirmation(
    orderId: string
) {
    try {
        await prisma.emailJob.create({
            data: {
                idempotencyKey: `order-confirmation:${orderId}`,
                orderId,
                type: 'order_confirmation',
                status: 'pending',
            },
        });

        return {
            queued: true,
            orderId,
        };
    } catch (error: unknown) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2002'
        ) {
            return {
                queued: false,
                orderId,
            };
        }

        throw error;
    }
}


export async function enqueueWelcomeEmail(customerId: string) {
    try {
        await prisma.emailJob.create({
            data: {
                idempotencyKey: `welcome-email:${customerId}`,
                customerId,
                type: 'welcome_email',
                status: 'pending',
            },
        });

        return { queued: true, customerId };
    } catch (error) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2002'
        ) {
            return { queued: false, customerId };
        }

        throw error;
    }
}
