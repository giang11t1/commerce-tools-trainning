import { NextRequest, NextResponse } from 'next/server';
import { getAvailableQuantity } from '@/lib/inventory';

export async function GET(request: NextRequest) {
    try {
        const sku = request.nextUrl.searchParams.get('sku');

        if (!sku) {
            return NextResponse.json(
                {
                    error: 'SKU is required',
                },
                {
                    status: 400,
                }
            );
        }

        const availableQuantity =
            await getAvailableQuantity(sku);

        return NextResponse.json({
            sku,
            availableQuantity,
        });
    } catch (error: any) {
        console.error(
            'Failed to get available inventory:',
            error
        );

        return NextResponse.json(
            {
                error:
                    error?.message ||
                    'Failed to get available inventory',
                body: error?.body,
                statusCode: error?.statusCode,
            },
            {
                status: error?.statusCode || 500,
            }
        );
    }
}
