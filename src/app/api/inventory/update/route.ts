import { NextRequest, NextResponse } from 'next/server';
import { updateInventoryQuantity } from '@/lib/inventory';

export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();

        const { sku, quantityOnStock } = body;

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

        if (
            typeof quantityOnStock !== 'number' ||
            quantityOnStock < 0
        ) {
            return NextResponse.json(
                {
                    error:
                        'quantityOnStock must be a number >= 0',
                },
                {
                    status: 400,
                }
            );
        }

        const inventory =
            await updateInventoryQuantity({
                sku,
                quantityOnStock,
            });

        return NextResponse.json({
            inventory,
        });
    } catch (error: any) {
        console.error(
            'Failed to update inventory:',
            error
        );

        return NextResponse.json(
            {
                error:
                    error?.message ||
                    'Failed to update inventory',
                body: error?.body,
                statusCode: error?.statusCode,
            },
            {
                status: error?.statusCode || 500,
            }
        );
    }
}
