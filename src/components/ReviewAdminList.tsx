'use client';

import { useState } from 'react';
import { StarIcon } from '@heroicons/react/24/solid';
import type { AdminReview } from '@/lib/reviews';
import Link from '@/components/commercetools-ui/atoms/link';

interface Review {
    id: string;
    version: number;
    authorName?: string;
    title?: string;
    text?: string;
    rating: number;
    createdAt: string;

    target?: {
        typeId: string;
        id: string;
    };

    state?: {
        typeId: string;
        id: string;
    };

    status: 'pending' | 'approved' | 'rejected';
}

interface Props {
    reviews: AdminReview[];
}

export default function ReviewAdminList({
                                            reviews: initialReviews,
                                        }: Props) {
    const [reviews, setReviews] =
        useState(initialReviews);

    const [loadingId, setLoadingId] =
        useState<string | null>(null);

    async function updateReview(
        review: AdminReview,
        action: 'approve' | 'reject',
    ) {
        setLoadingId(review.id);

        try {
            console.log('Updating review:', {
                reviewId: review.id,
                version: review.version,
                action,
            });

            const response = await fetch('/api/admin/reviews', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    reviewId: review.id,
                    version: review.version,
                    action,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error || 'Unable to update review',
                );
            }

            // Keep existing productName/productSku and update
            // only the fields returned from the API.
            setReviews((currentReviews) =>
                currentReviews.map((item) =>
                    item.id === review.id
                        ? {
                            ...item,
                            id: data.id,
                            version: data.version,
                            state: data.state,
                            status: data.status,
                        }
                        : item,
                ),
            );

            // Show success message
            alert(
                action === 'approve'
                    ? 'Review has been approved successfully.'
                    : 'Review has been rejected successfully.',
            );
        } catch (error) {
            console.error('Update review error:', error);

            alert(
                error instanceof Error
                    ? error.message
                    : 'Unable to update review',
            );
        } finally {
            setLoadingId(null);
        }
    }

    return (
        <div className="overflow-hidden rounded-lg border">
            <table className="w-full">
                <thead>
                <tr className="border-b bg-gray-50 text-left">
                    <th className="px-4 py-3">
                        Product
                    </th>

                    <th className="px-4 py-3">
                        Customer
                    </th>

                    <th className="px-4 py-3">
                        Rating
                    </th>

                    <th className="px-4 py-3">
                        Review
                    </th>

                    <th className="px-4 py-3">
                        Status
                    </th>

                    <th className="px-4 py-3">
                        Actions
                    </th>
                </tr>
                </thead>

                <tbody>
                {reviews.map((review) => {
                    const isLoading =
                        loadingId === review.id;

                    return (
                        <tr
                            key={review.id}
                            className="border-b"
                        >
                            <td className="px-4 py-4">
                                <div className="font-medium">
                                    <Link link={`/products/${review.productSlug}`} className="text-blue-500 hover:underline">
                                        {review.productName}
                                    </Link>
                                </div>

                                <div className="text-sm text-gray-500">
                                    SKU: {review.productSku}
                                </div>
                            </td>

                            <td className="px-4 py-4">
                                {review.authorName}
                            </td>

                            <td className="px-4 py-4">
                                <div className="flex">
                                    {[1, 2, 3, 4, 5].map(
                                        (star) => (
                                            <StarIcon
                                                key={star}
                                                className={
                                                    star <= review.rating
                                                        ? 'text-yellow-400'
                                                        : 'text-gray-300'
                                                }
                                                width={18}
                                                height={18}
                                            />
                                        )
                                    )}
                                </div>
                            </td>

                            <td className="max-w-xs px-4 py-4">
                                <div className="font-medium">
                                    {review.title}
                                </div>

                                <div className="truncate text-sm text-gray-500">
                                    {review.text}
                                </div>
                            </td>

                            <td className="px-4 py-4">
                                <Status
                                    review={review}
                                />
                            </td>

                            <td className="px-4 py-4">
                                <div className="flex gap-2">
                                        <button
                                            type="button"
                                            disabled={isLoading}
                                            className="text-green-600 hover:text-green-800"
                                            onClick={() => updateReview(review, 'approve')}
                                        >
                                            Approve
                                        </button>

                                        <button
                                            type="button"
                                            disabled={isLoading}
                                            className="text-red-600 hover:text-red-800"
                                            onClick={() => updateReview(review, 'reject')}
                                        >
                                            Reject
                                        </button>
                                </div>
                            </td>
                        </tr>
                    );
                })}
                </tbody>
            </table>

            {!reviews.length && (
                <div className="p-10 text-center text-gray-500">
                    No reviews found.
                </div>
            )}
        </div>
    );
}

function Status({
                    review,
                }: {
    review: AdminReview;
}) {
    if (review.status === 'approved') {
        return (
            <span className="text-green-600">
        Approved
      </span>
        );
    }

    if (review.status === 'rejected') {
        return (
            <span className="text-red-600">
        Rejected
      </span>
        );
    }

    return (
        <span className="text-orange-600">
          Pending
        </span>
    );
}
