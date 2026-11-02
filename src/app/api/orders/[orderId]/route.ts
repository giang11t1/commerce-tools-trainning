// app/api/orders/[orderId]/route.ts

import { NextResponse } from 'next/server';
import { fakeOrder } from '@/lib/mock-order';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ orderId: string }> }
) {
    const { orderId } = await params;

    if (orderId !== fakeOrder.id) {
        return NextResponse.json(
            {
                error: 'Order not found',
            },
            {
                status: 404,
            }
        );
    }

    return NextResponse.json(fakeOrder);
}
