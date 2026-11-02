import {
    getAllProductReviews,
} from '@/lib/reviews';

import ReviewAdminList from '@/components/ReviewAdminList';

export default async function AdminReviewsPage() {
    const reviews = await getAllProductReviews();

    return (
        <div className="container mx-auto px-6 py-10">
            <h1 className="mb-8 text-3xl font-semibold">
                Product Reviews
            </h1>

            <ReviewAdminList reviews={reviews} />
        </div>
    );
}
