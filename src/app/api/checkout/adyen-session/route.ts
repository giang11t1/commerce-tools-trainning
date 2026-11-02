
import { NextResponse } from 'next/server';
import { createCheckoutSession } from '@/lib/checkout';
import { apiRoot } from '@/lib/commercetools';
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

        const projectKey = process.env.CT_PROJECT_KEY;
        if (!projectKey) {
            throw new Error('CT_PROJECT_KEY is not configured');
        }

        const cartResponse = await apiRoot
            .withProjectKey({ projectKey })
            .carts()
            .withId({ ID: cart.id })
            .get()
            .execute();
        const latestCart = cartResponse.body;

        await createCheckoutSession(
            latestCart.id,
            typeof locale === 'string' ? locale : 'en-US',
        );

        const adyenResponse = await fetch(
            'https://checkout-test.adyen.com/v71/sessions',
            {
                method: 'POST',
                headers: {
                    'X-API-Key': process.env.ADYEN_API_KEY!,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    merchantAccount: process.env.ADYEN_MERCHANT_ACCOUNT,
                    reference: `cart-${latestCart.id}`,
                    amount: {
                        currency: latestCart.totalPrice.currencyCode,
                        value: latestCart.totalPrice.centAmount,
                    },
                    returnUrl: `${request.headers.get('origin')}/checkout`,
                    channel: 'Web',
                }),
            }
        );

        if (!adyenResponse.ok) {
            const errorText =
                await adyenResponse.text();

            throw new Error(
                `Adyen error: ${adyenResponse.status} ${errorText}`
            );
        }

        const adyenSession =
            await adyenResponse.json();

        return NextResponse.json({
            session: {
                id: adyenSession.id,
                sessionData:
                adyenSession.sessionData,
            },

            clientKey:
            process.env.ADYEN_CLIENT_KEY,
        });
    } catch (error) {
        const details = getMockOrderErrorDetails(error);
        console.error('Adyen session error:', {
            statusCode: details.statusCode,
            errorCode: details.errorCode,
            message: details.message,
            correlationId: details.correlationId,
        });

        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
