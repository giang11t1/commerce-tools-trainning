import { NextRequest, NextResponse } from 'next/server';
import { getInventoryMapBySkus } from '@/lib/inventory';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const skus = body.skus;

        if (!Array.isArray(skus)) {
            return NextResponse.json(
                {
                    error: 'skus must be an array',
                },
                {
                    status: 400,
                }
            );
        }

        const inventory =
            await getInventoryMapBySkus(skus);

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
