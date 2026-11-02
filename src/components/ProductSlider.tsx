'use client';

import { Slide, Splide, SplideSlide } from '@splidejs/react-splide';
import '@splidejs/react-splide/css';

import { ProductProjection } from '@commercetools/platform-sdk';
import ProductCard from '@/components/ProductCard';
import type { ProductRating } from '@/lib/reviews';

type ProductWithRating = {
    product: ProductProjection;
    rating: ProductRating;
    availableQuantity: number;
    variantQuantities?: Record<string, number>;
};

interface ProductSliderProps {
    products: ProductWithRating[];
}

export default function ProductSlider({
                                          products,
                                      }: ProductSliderProps) {
    if (!products?.length) return null;

    return (
        <div className="product-slider relative">
            <Splide
                options={{
                    perPage: 4,
                    gap: '1.5rem',
                    pagination: false,
                    arrows: true,
                    breakpoints: {
                        1024: {
                            perPage: 3,
                        },
                        768: {
                            perPage: 2,
                        },
                        640: {
                            perPage: 1,
                        },
                    },
                }}
            >
                {products.map(
                    ({
                         product,
                         rating,
                         availableQuantity,
                         variantQuantities,
                     }: ProductWithRating) => (
                        <SplideSlide
                            key={product.id}
                            className="py-2"
                        >
                            <ProductCard
                                product={product}
                                rating={rating}
                                availableQuantity={availableQuantity}
                                variantQuantities={variantQuantities}
                            />
                        </SplideSlide>
                    )
                )}
            </Splide>
        </div>
    );
}
