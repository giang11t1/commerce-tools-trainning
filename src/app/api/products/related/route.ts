// app/api/products/related/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getRelatedProductsCart} from '@/lib/products';

export async function POST(request: NextRequest) {
    try {
        const { categoryIds, excludeIds, locale } = await request.json();

        if (!categoryIds?.length) {
            return NextResponse.json([]);
        }

        const products = await getRelatedProductsCart(
            categoryIds,
            Array.isArray(excludeIds) ? excludeIds : [],
            typeof locale === 'string' ? locale : 'en-US',
        );

        console.log('Related products:', products);
        const relatedProducts = products
            .filter((product) => !excludeIds?.includes(product.id))
            .slice(0, 8);

        return NextResponse.json(relatedProducts);
    } catch (error) {
        console.error('Failed to get related products:', error);

        return NextResponse.json(
            { error: 'Failed to get related products' },
            { status: 500 }
        );
    }
}
