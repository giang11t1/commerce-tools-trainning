import {
    getProductRating,
    getProductReviews,
} from '@/lib/reviews';

import ProductRating from './ProductRating';
import ReviewWriteButton from "@/components/ReviewWriteButton";
import { UserCircleIcon } from '@heroicons/react/24/outline';

export default async function ProductReviews({
                                                 productId,
                                             }: {
    productId: string;
}) {
    const [rating, reviews] = await Promise.all([
        getProductRating(productId),
        getProductReviews(productId),
    ]);

    return (
        <section id="reviews" className="">
            <h2 className="mb-6 text-2xl font-semibold text-center uppercase">
                Reviews
            </h2>

            <div className="mb-8 flex items-center gap-4 justify-center">
                <span className="text-4xl font-semibold">
                  {rating.averageRating.toFixed(1)}
                </span>

                <div>
                    <ProductRating
                        rating={rating.averageRating}
                        reviewCount={rating.reviewCount}
                    />
                </div>
            </div>

            <div className="mb-10 flex justify-end w-full">
                <ReviewWriteButton productId={productId} />
            </div>

            <div className="space-y-6">
                {reviews.map((review) => (
                    <article
                        key={review.id}
                        className="bg-[#ebebeb] rounded-md p-6"
                    >
                        <ProductRating
                            rating={review.rating}
                            showCount={false}
                        />

                       <div className="flex items-center gap-2 mt-4 ">
                           <UserCircleIcon className="h-6 w-6 text-gray-500" />
                           <p className="text-sm font-semibold">
                               {review.authorName}
                           </p>
                       </div>

                        {review.title && (
                            <h3 className="mt-2 font-semibold pl-8">
                                {review.title}
                            </h3>
                        )}

                        <p className="mt-2 text-gray-700 pl-8">
                            {review.text}
                        </p>
                    </article>
                ))}
            </div>

        </section>
    );
}
