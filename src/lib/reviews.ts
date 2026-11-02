import { apiRoot } from '@/lib/commercetools';
import type { Review } from '@commercetools/platform-sdk';

export interface ProductReview {
    id: string;
    authorName?: string;
    title?: string;
    text?: string;
    rating: number;
    createdAt: string;
}

export interface ProductRating {
    averageRating: number;
    reviewCount: number;
}

export interface AdminReview {
    id: string;
    productId: string;
    productName: string;
    productSku: string;
    productSlug: string;
    authorName: string;
    title?: string;
    text?: string;
    rating: number;
    createdAt: string;
    version?: number;
    status?: 'pending' | 'approved' | 'rejected';
    state?: {
        typeId: 'state';
        id: string;
    };
}

export async function createProductReview({
                                              productId,
                                              authorName,
                                              title,
                                              text,
                                              rating,
                                          }: {
    productId: string;
    authorName: string;
    title: string;
    text: string;
    rating: number;
}) {
    const response = await apiRoot
        .withProjectKey({
            projectKey: process.env.CT_PROJECT_KEY!,
        })
        .reviews()
        .post({
            body: {
                target: {
                    typeId: 'product',
                    id: productId,
                },

                authorName,
                title,
                text,
                rating,

                state: {
                    typeId: 'state',
                    key: 'review-pending',
                },
            },
        })
        .execute();

    return response.body;
}

export async function getProductReviews(
    productId: string
): Promise<ProductReview[]> {
    const response = await apiRoot
        .withProjectKey({
            projectKey: process.env.CT_PROJECT_KEY!,
        })
        .reviews()
        .get({
            queryArgs: {
                where: `target(id="${productId}") and state(id="${process.env.CT_REVIEW_APPROVED_STATE_ID}")`,
                sort: ['createdAt desc'],
                limit: 100,
            },
        })
        .execute();

    return response.body.results.map((review: Review) => ({
        id: review.id,
        authorName: review.authorName,
        title: review.title,
        text: review.text,
        rating: review.rating ?? 0,
        createdAt: review.createdAt,
    }));
}

export async function getProductRating(
    productId: string
): Promise<ProductRating> {
    const reviews = await getProductReviews(productId);

    if (!reviews.length) {
        return {
            averageRating: 0,
            reviewCount: 0,
        };
    }

    const total = reviews.reduce(
        (sum, review) => sum + review.rating,
        0
    );

    return {
        averageRating: Number((total / reviews.length).toFixed(1)),
        reviewCount: reviews.length,
    };
}


export async function getAllProductReviews(): Promise<AdminReview[]> {
    const response = await apiRoot
        .withProjectKey({
            projectKey: process.env.CT_PROJECT_KEY!,
        })
        .reviews()
        .get({
            queryArgs: {
                limit: 100,
                sort: ['createdAt desc'],
            },
        })
        .execute();

    const reviews = response.body.results;

    const productIds = [
        ...new Set(
            reviews
                .map((review) => review.target?.id)
                .filter((id): id is string => Boolean(id)),
        ),
    ];

    let productMap = new Map<
        string,
        {
            name: string;
            sku: string;
        }
    >();

    if (productIds.length > 0) {
        const productsResponse = await apiRoot
            .withProjectKey({
                projectKey: process.env.CT_PROJECT_KEY!,
            })
            .products()
            .get({
                queryArgs: {
                    where: `id in (${productIds
                        .map((id) => `"${id}"`)
                        .join(',')})`,
                    limit: productIds.length,
                },
            })
            .execute();

        productMap = new Map(
            productsResponse.body.results.map((product) => {
                const current = product.masterData.current;

                const name =
                    current.name?.en ??
                    Object.values(current.name ?? {})[0] ??
                    'Unnamed product';

                const sku =
                    current.masterVariant?.sku ?? 'N/A';

                const slug: string =
                    current.slug?.en ??
                    Object.values(current.slug ?? {})[0] ??
                    '';

                return [
                    product.id,
                    {
                        name,
                        sku,
                        slug,
                    },
                ];
            }),
        );
    }

    return reviews.map((review: Review) => {
        const productId: string =
            review.target?.id ?? '';

        const product = productMap.get(productId);

        let status:
            | 'pending'
            | 'approved'
            | 'rejected' = 'pending';

        if (
            review.state?.id ===
            process.env.CT_REVIEW_APPROVED_STATE_ID
        ) {
            status = 'approved';
        } else if (
            review.state?.id ===
            process.env.CT_REVIEW_REJECTED_STATE_ID
        ) {
            status = 'rejected';
        }

        return {
            id: review.id,
            productId,

            productName:
                product?.name ?? 'Unknown product',

            productSlug:
                product?.slug ?? '',

            productSku:
                product?.sku ?? 'N/A',

            authorName:
                review.authorName ?? 'Anonymous',

            title: review.title,
            text: review.text,
            rating: review.rating ?? 0,
            createdAt: review.createdAt,
            version: review.version,
            state: review.state,
            status,
        };
    });
}

export async function transitionReview(
    reviewId: string,
    version: number,
    stateId: string
) {
    const response = await apiRoot
        .withProjectKey({
            projectKey: process.env.CT_PROJECT_KEY!,
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

    return response.body;
}
