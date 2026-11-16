import { NextResponse } from 'next/server';
import { mockOrderPaymentEnabled, simulateOrderPayment } from '@/lib/order-mock-payment';
import { OrderPaymentError } from '@/lib/order-mock-payment-core';

export async function POST(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
    const headers = { 'Cache-Control': 'no-store' };
    if (!mockOrderPaymentEnabled()) return NextResponse.json({ error: 'disabled' }, { status: 404, headers });
    const origin = request.headers.get('origin');
    if (!origin || origin !== new URL(request.url).origin) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 403, headers });
    }
    try {
        const { orderId } = await params;
        const order = await simulateOrderPayment(orderId);
        return NextResponse.json({ orderId: order.id, paymentState: order.paymentState }, { headers });
    } catch (error) {
        const statusCode = error instanceof OrderPaymentError ? error.status : (error as { statusCode?: number })?.statusCode;
        const status = statusCode && [400, 401, 403, 404, 409, 503].includes(statusCode) ? statusCode : 502;
        const code = error instanceof OrderPaymentError ? error.code :
            status === 401 || status === 403 ? 'unauthorized' : status === 409 ? 'conflict' : 'upstream';
        console.error('Post-approval mock payment failed:', { code, status });
        return NextResponse.json({ error: code }, { status, headers });
    }
}
