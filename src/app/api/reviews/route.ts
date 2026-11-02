import { NextRequest, NextResponse } from 'next/server';
import { createProductReview } from '@/lib/reviews';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        console.log('CREATE REVIEW BODY:', body);

        const {
            productId,
            authorName,
            title,
            text,
            rating,
        } = body;

        if (!productId) {
            return NextResponse.json(
                { error: 'Product ID is required' },
                { status: 400 }
            );
        }

        if (!authorName) {
            return NextResponse.json(
                { error: 'Author name is required' },
                { status: 400 }
            );
        }

        if (!text) {
            return NextResponse.json(
                { error: 'Review text is required' },
                { status: 400 }
            );
        }

        if (
            typeof rating !== 'number' ||
            rating < 1 ||
            rating > 5
        ) {
            return NextResponse.json(
                { error: 'Rating must be between 1 and 5' },
                { status: 400 }
            );
        }

        const review = await createProductReview({
            productId,
            authorName,
            title,
            text,
            rating,
        });

        return NextResponse.json(review);
    } catch (error: any) {
        console.error('========== CREATE REVIEW ERROR ==========');
        console.error(error);
        console.error('STATUS:', error?.statusCode);
        console.error('BODY:', error?.body);
        console.error('MESSAGE:', error?.message);
        console.error('==========================================');

        return NextResponse.json(
            {
                error:
                    error?.body?.message ||
                    error?.message ||
                    'Unable to create review',
                details: error?.body?.errors,
            },
            {
                status: error?.statusCode || 500,
            }
        );
    }
}
