import { NextResponse } from 'next/server';
import {
    getProductSelectionByKey,
    getProductSelectionProducts,
    getStoreByKey,
} from '@/lib/productSelections';

export async function GET() {
    try {
        const store = await getStoreByKey('b2c-retail-store');

        const selection =
            await getProductSelectionByKey('avocado');

        const products =
            await getProductSelectionProducts(selection.id);

        return NextResponse.json({
            store,
            selection,
            products,
        });
    } catch (error: any) {
        console.error('Product selection error:', error);

        return NextResponse.json(
            {
                error: error?.message,
                statusCode: error?.statusCode,
                body: error?.body,
            },
            { status: 500 }
        );
    }
}
