import { NextResponse, NextRequest } from 'next/server';
import {
    getAllProductReviews,
    transitionReview,
} from '@/lib/reviews';
import {apiRoot} from "@/lib/commercetools";
import {ClientResponse, Review} from "@commercetools/platform-sdk";

export async function GET() {
    try {
        const reviews = await getAllProductReviews();

        return NextResponse.json(reviews);
    } catch (error: any) {
        console.error('Get reviews error:', error);

        return NextResponse.json(
            {
                error:
                    error?.body?.message ||
                    error?.message ||
                    'Unable to get reviews',
            },
            { status: 500 }
        );
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();

        const {
            reviewId,
            version,
            action,
        } = body;

        if (!reviewId || !version || !action) {
            return NextResponse.json(
                {
                    error: 'Missing required fields',
                },
                { status: 400 },
            );
        }

        const stateId: string | undefined =
            action === 'approve'
                ? process.env.CT_REVIEW_APPROVED_STATE_ID
                : process.env.CT_REVIEW_REJECTED_STATE_ID;

        if (!stateId) {
            return NextResponse.json(
                {
                    error: 'Review state ID is not configured',
                },
                { status: 500 },
            );
        }

        const response: ClientResponse<Review> =
            await apiRoot
                .withProjectKey({
                    projectKey:
                        process.env.CT_PROJECT_KEY!,
                })
                .reviews()
                .withId({
                    ID: reviewId,
                })
                .post({
                    body: {
                        version,
                        actions: [
                            {
                                action: 'transitionState',
                                state: {
                                    typeId: 'state',
                                    id: stateId,
                                },
                            },
                        ],
                    },
                })
                .execute();

        // The updated commercetools Review
        const updatedReview = response.body;

        // Convert commercetools state into your UI status
        let status:
            | 'pending'
            | 'approved'
            | 'rejected' = 'pending';

        if (
            updatedReview.state?.id ===
            process.env.CT_REVIEW_APPROVED_STATE_ID
        ) {
            status = 'approved';
        } else if (
            updatedReview.state?.id ===
            process.env.CT_REVIEW_REJECTED_STATE_ID
        ) {
            status = 'rejected';
        }

        return NextResponse.json({
            id: updatedReview.id,
            version: updatedReview.version,
            state: updatedReview.state,
            status,
        });
    } catch (error) {
        console.error(
            'Update review error:',
            error,
        );

        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : 'Unable to update review',
            },
            { status: 500 },
        );
    }
}
