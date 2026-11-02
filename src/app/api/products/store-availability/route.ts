import { NextRequest, NextResponse } from 'next/server';
import { isProductAvailableInCustomerStore } from '@/lib/cart';

export async function POST(request: NextRequest) {
    try {
        const { productIds } = await request.json();

        if (
            !Array.isArray(productIds) ||
            productIds.some((id) => typeof id !== 'string') ||
            productIds.length > 100
        ) {
            return NextResponse.json(
                { message: 'productIds must be an array of up to 100 product IDs' },
                { status: 400 }
            );
        }

        const availability = Object.fromEntries(
            await Promise.all(
                [...new Set(productIds)].map(async (productId: string) => [
                    productId,
                    await isProductAvailableInCustomerStore(productId),
                ])
            )
        );

        return NextResponse.json({ availability });
    } catch (error) {
        console.error('Failed to load store product availability:', error);
        return NextResponse.json(
            { message: 'Failed to load store product availability' },
            { status: 500 }
        );
    }
}
