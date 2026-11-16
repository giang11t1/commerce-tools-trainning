import { NextRequest, NextResponse } from 'next/server';
import { getInventoryMapBySkus } from '@/lib/inventory';
import { getInventorySupplyContext } from '@/lib/cart';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const skus = body.skus;

        if (
            !Array.isArray(skus) ||
            skus.length > 500 ||
            !skus.every((sku) => typeof sku === 'string' && sku.length > 0 && sku.length <= 256)
        ) {
            return NextResponse.json(
                {
                    error: 'skus must be an array of up to 500 non-empty strings',
                },
                {
                    status: 400,
                }
            );
        }

        const inventory =
            await getInventoryMapBySkus(skus, await getInventorySupplyContext());

        return NextResponse.json({
            inventory,
        });
    } catch (error: any) {
        console.error(
            'Failed to get inventory:',
            error
        );

        return NextResponse.json(
            {
                error:
                    error?.message ||
                    'Failed to get inventory',
            },
            {
                status: error?.statusCode || 500,
            }
        );
    }
}
