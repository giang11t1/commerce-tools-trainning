import { timingSafeEqual } from 'node:crypto';
import type { Cart } from '@commercetools/platform-sdk';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { apiRoot } from '@/lib/commercetools';
import { getCart } from '@/lib/cart';

export const runtime = 'nodejs';

const CART_ID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MINIMUM_TOKEN_LENGTH = 32;

function isAuthorized(request: Request, expectedToken: string) {
    const authorization = request.headers.get('authorization');
    const providedToken = authorization?.startsWith('Bearer ')
        ? authorization.slice('Bearer '.length)
        : '';

    if (providedToken.length < MINIMUM_TOKEN_LENGTH) {
        return false;
    }

    const providedBuffer = Buffer.from(providedToken, 'utf8');
    const expectedBuffer = Buffer.from(expectedToken, 'utf8');

    return (
        providedBuffer.length === expectedBuffer.length &&
        timingSafeEqual(providedBuffer, expectedBuffer)
    );
}

function toMoney(money: {
    type: string;
    currencyCode: string;
    centAmount?: number;
    preciseAmount?: number;
    fractionDigits?: number;
}) {
    return {
        type: money.type,
        currencyCode: money.currencyCode,
        centAmount: money.centAmount,
        preciseAmount: money.preciseAmount,
        fractionDigits: money.fractionDigits,
    };
}

function toInspectedCart(cart: Cart) {
    return {
        id: cart.id,
        version: cart.version,
        currency: cart.totalPrice.currencyCode,
        country: cart.country ?? null,
        cartState: cart.cartState,
        lineItems: cart.lineItems.map((item) => ({
            id: item.id,
            name:
                item.name['en-US'] ??
                Object.values(item.name)[0] ??
                'Product',
            sku: item.variant.sku ?? null,
            quantity: item.quantity,
            unitPrice: toMoney(item.price.value),
            totalPrice: toMoney(item.totalPrice),
        })),
        totalPrice: toMoney(cart.totalPrice),
    };
}

function jsonResponse(
    body: Record<string, unknown>,
    status: number,
) {
    return NextResponse.json(body, {
        status,
        headers: {
            'Cache-Control': 'no-store',
        },
    });
}

export async function POST(request: Request) {
    if (process.env.NODE_ENV === 'production') {
        return new Response(null, { status: 404 });
    }

    const accessToken = process.env.CART_INSPECTOR_ACCESS_TOKEN;
    if (!accessToken || accessToken.length < MINIMUM_TOKEN_LENGTH) {
        return new Response(null, { status: 404 });
    }

    if (!isAuthorized(request, accessToken)) {
        return jsonResponse({ error: 'Developer authorization required.' }, 401);
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return jsonResponse({ error: 'A valid JSON request body is required.' }, 400);
    }

    if (
        body &&
        typeof body === 'object' &&
        'source' in body &&
        body.source === 'active'
    ) {
        try {
            const cookieCartId = (await cookies()).get('cartId')?.value ?? null;
            if (cookieCartId && !CART_ID_PATTERN.test(cookieCartId)) {
                return jsonResponse({ error: 'The cartId cookie is not a valid cart ID.' }, 400);
            }

            const cart = await getCart();
            return jsonResponse({
                cookieCartId,
                cart: cart ? toInspectedCart(cart) : null,
            }, 200);
        } catch {
            console.error('Cart inspector could not read the active storefront cart.');
            return jsonResponse(
                { error: 'The active storefront cart could not be read.' },
                502,
            );
        }
    }

    if (
        !body ||
        typeof body !== 'object' ||
        !('cartId' in body) ||
        typeof body.cartId !== 'string' ||
        !CART_ID_PATTERN.test(body.cartId)
    ) {
        return jsonResponse({ error: 'A valid cart ID is required.' }, 400);
    }

    try {
        const response = await apiRoot
            .withProjectKey({
                projectKey: process.env.CT_PROJECT_KEY!,
            })
            .carts()
            .withId({ ID: body.cartId })
            .get()
            .execute();

        return jsonResponse({ cart: toInspectedCart(response.body) }, 200);
    } catch (error) {
        if (
            typeof error === 'object' &&
            error !== null &&
            (('statusCode' in error && error.statusCode === 404) ||
                ('status' in error && error.status === 404) ||
                ('body' in error &&
                    typeof error.body === 'object' &&
                    error.body !== null &&
                    'statusCode' in error.body &&
                    error.body.statusCode === 404))
        ) {
            return jsonResponse(
                { error: 'No accessible cart with that ID was found.' },
                404,
            );
        }

        console.error('Cart inspector could not read the requested cart.');
        return jsonResponse(
            { error: 'The cart could not be read from the configured project.' },
            502,
        );
    }
}
