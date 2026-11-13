import { NextResponse } from 'next/server';
import {
    RecurringOrderActionError,
    updateMyRecurringOrder,
    type RecurringOrderAction,
} from '@/lib/recurring-orders';

const actions = new Set<RecurringOrderAction>([
    'pause',
    'resume',
    'cancel',
    'skip',
]);

export async function POST(
    request: Request,
    { params }: { params: Promise<{ recurringOrderId: string }> },
) {
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');
    if (!origin || !host) {
        return NextResponse.json(
            { error: 'A same-origin request is required.' },
            { status: 403 },
        );
    }

    try {
        if (new URL(origin).host !== host) {
            return NextResponse.json(
                { error: 'A same-origin request is required.' },
                { status: 403 },
            );
        }
    } catch {
        return NextResponse.json(
            { error: 'A same-origin request is required.' },
            { status: 403 },
        );
    }

    if (!request.headers.get('content-type')?.includes('application/json')) {
        return NextResponse.json(
            { error: 'A JSON request is required.' },
            { status: 415 },
        );
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
            { error: 'Invalid request body.' },
            { status: 400 },
        );
    }

    const action =
        typeof body === 'object' &&
        body !== null &&
        'action' in body &&
        typeof body.action === 'string' &&
        actions.has(body.action as RecurringOrderAction)
            ? (body.action as RecurringOrderAction)
            : undefined;
    if (!action) {
        return NextResponse.json(
            { error: 'Choose a supported subscription action.' },
            { status: 400 },
        );
    }

    const { recurringOrderId } = await params;
    try {
        await updateMyRecurringOrder(recurringOrderId, action);
        return NextResponse.json(
            { success: true },
            { headers: { 'Cache-Control': 'no-store' } },
        );
    } catch (error) {
        if (error instanceof RecurringOrderActionError) {
            return NextResponse.json(
                { error: error.message, code: error.code },
                {
                    status: error.status,
                    headers: { 'Cache-Control': 'no-store' },
                },
            );
        }

        const statusCode = (error as { statusCode?: number })?.statusCode;
        if (statusCode === 409) {
            return NextResponse.json(
                { error: 'This subscription changed in another request. Refresh and try again.' },
                { status: 409, headers: { 'Cache-Control': 'no-store' } },
            );
        }

        console.error('Failed to update recurring order:', error);
        return NextResponse.json(
            { error: 'Unable to update this subscription right now.' },
            { status: 500, headers: { 'Cache-Control': 'no-store' } },
        );
    }
}
