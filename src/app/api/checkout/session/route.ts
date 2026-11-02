import { NextResponse } from 'next/server';
import { createCheckoutSession } from '@/lib/checkout';
import { getCart } from '@/lib/cart';
import { getMockOrderErrorDetails } from '@/lib/mock-order-utils';

export async function POST(request: Request) {
    try {
        const { locale } = await request.json();
        const cart = await getCart();
        if (!cart || cart.cartState !== 'Active') {
            return NextResponse.json(
                { error: 'Your active cart could not be found. Return to your cart and try again.' },
                { status: 404 },
            );
        }
        if (
            !cart.shippingInfo?.shippingMethod?.id ||
            cart.shippingInfo.shippingMethodState !== 'MatchesCart'
        ) {
            return NextResponse.json(
                { error: 'Choose an available shipping method before continuing.' },
                { status: 409 },
            );
        }

        const checkoutSession = await createCheckoutSession(
            cart.id,
            typeof locale === 'string' ? locale : 'en-US',
        );

        return NextResponse.json({
            sessionId: checkoutSession.sessionId,
            projectKey: checkoutSession.projectKey,
            region: checkoutSession.region,
        });
    } catch (error) {
        const details = getMockOrderErrorDetails(error);
        console.error('Checkout session error:', {
            statusCode: details.statusCode,
            errorCode: details.errorCode,
            message: details.message,
            correlationId: details.correlationId,
        });

        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
