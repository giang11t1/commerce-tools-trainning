import { NextRequest, NextResponse } from 'next/server';
import { getInventoryBySku } from '@/lib/inventory';

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

        const inventory = await getInventoryBySku(sku);

        return NextResponse.json({
            inventory,
        });
    } catch (error: any) {
        console.error('Failed to get inventory:', error);

        return NextResponse.json(
            {
                error: error?.message || 'Failed to get inventory',
                body: error?.body,
                statusCode: error?.statusCode,
            },
            {
                status: error?.statusCode || 500,
            }
        );
    }
}
