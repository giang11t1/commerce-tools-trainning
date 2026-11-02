import { NextResponse } from 'next/server';
import {
    createMockOrderFromCurrentCart,
    MockOrderError,
    type MockOrderInput,
} from '@/lib/mock-orders';
import { getMockOrderFailure } from '@/lib/mock-order-utils';

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isShortString(value: unknown, maxLength: number): value is string {
    return typeof value === 'string' && value.length <= maxLength;
}

const addressFields = [
    'firstName',
    'lastName',
    'company',
    'streetName',
    'streetNumber',
    'additionalStreetInfo',
    'city',
    'postalCode',
    'state',
    'region',
    'country',
    'phone',
] as const;

function parseAddress(value: unknown): MockOrderInput['shippingAddress'] | undefined {
    if (!isRecord(value)) return undefined;
    if (
        !addressFields.every(
            (field) =>
                value[field] === undefined || isShortString(value[field], 200),
        )
    ) {
        return undefined;
    }

    return Object.fromEntries(
        addressFields.map((field) => [field, value[field]]),
    ) as MockOrderInput['shippingAddress'];
}

function parseMockOrderInput(value: unknown): MockOrderInput | undefined {
    if (!isRecord(value)) {
        return undefined;
    }

    const shippingAddress = parseAddress(value.shippingAddress);
    const billingAddress = parseAddress(value.billingAddress);

    if (
        (value.email !== undefined && !isShortString(value.email, 254)) ||
        !isShortString(value.shippingMethod, 40) ||
        !shippingAddress ||
        !billingAddress
    ) {
        return undefined;
    }

    return {
        email: typeof value.email === 'string' ? value.email : undefined,
        shippingMethod: value.shippingMethod,
        shippingAddress,
        billingAddress,
    };
}

export async function POST(request: Request) {
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    }

    const origin = request.headers.get('origin');
    const host = request.headers.get('host');
    if (!origin || !host) {
        return NextResponse.json(
            { error: 'A same-origin checkout request is required.' },
            { status: 403 },
        );
    }
    try {
        if (new URL(origin).host !== host) {
            return NextResponse.json(
                { error: 'A same-origin checkout request is required.' },
                { status: 403 },
            );
        }
    } catch {
        return NextResponse.json(
            { error: 'A same-origin checkout request is required.' },
            { status: 403 },
        );
    }

    if (!request.headers.get('content-type')?.includes('application/json')) {
        return NextResponse.json(
            { error: 'A JSON checkout request is required.' },
            { status: 415 },
        );
    }

    let input: MockOrderInput | undefined;
    try {
        input = parseMockOrderInput(await request.json());
    } catch {
        input = undefined;
    }
    if (!input || !input.shippingMethod.trim()) {
        return NextResponse.json(
            { error: 'Checkout details are incomplete. Review your address and shipping method.' },
            { status: 400 },
        );
    }

    try {
        const result = await createMockOrderFromCurrentCart(input);

        return NextResponse.json(
            { orderId: result.order.id, created: result.created },
            { headers: { 'Cache-Control': 'no-store' } },
        );
    } catch (error) {
        if (error instanceof MockOrderError) {
            return NextResponse.json(
                { error: error.message },
                { status: error.status, headers: { 'Cache-Control': 'no-store' } },
            );
        }

        const failure = getMockOrderFailure(
            error,
            input.shippingAddress.country,
        );
        console.error(
            `Mock order request failed ${JSON.stringify({
                stage: failure.details.stage,
                errorName: failure.details.errorName,
                upstreamStatus: failure.details.statusCode,
                errorCode: failure.details.errorCode,
                correlationId: failure.details.correlationId,
                message: failure.details.message,
            })}`,
        );
        return NextResponse.json(
            { error: failure.message },
            { status: failure.status, headers: { 'Cache-Control': 'no-store' } },
        );
    }
}
