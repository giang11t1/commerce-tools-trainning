'use client';

import { useEffect, useState } from 'react';
import { Splide, SplideSlide } from '@splidejs/react-splide';
import '@splidejs/react-splide/css';
import ProductCard from "@/components/ProductCard";
import {ProductProjection} from "@commercetools/platform-sdk";

interface ProductSliderProps {
    products: ProductProjection[];
}

export default function RelatedProducts({
                                            products,
                                        }: ProductSliderProps) {
    // Products are only rendered together with their inventory. Rendering them
    // before the stock request resolves showed every card as "Out of stock",
    // because stock is tracked per supply channel and
    // `availability.availableQuantity` is not set on the projection.
    const [loaded, setLoaded] = useState<{
        products: ProductProjection[];
        inventory: Record<string, number>;
    }>({ products: [], inventory: {} });

    useEffect(() => {
        const skus = products
            .flatMap((product) => [product.masterVariant, ...(product.variants ?? [])])
            .map((variant) => variant.sku)
            .filter((sku): sku is string => Boolean(sku));

        if (!skus.length) {
            setLoaded({ products, inventory: {} });
            return;
        }

        let cancelled = false;

        fetch('/api/inventory/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ skus }),
        })
            .then(async (response) => {
                if (!response.ok) throw new Error('Failed to load related product inventory');
                return response.json();
            })
            .then((data: { inventory?: Record<string, number> }) => {
                if (!cancelled) setLoaded({ products, inventory: data.inventory ?? {} });
            })
            .catch((error) => {
                console.error('Failed to load related product inventory:', error);
                if (!cancelled) setLoaded({ products, inventory: {} });
            });

        return () => {
            cancelled = true;
        };
    }, [products]);

    const { inventory } = loaded;

    if (!loaded.products.length) return null;

    return (
        <section className="mt-12">
            <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-bold">
                    You May Also Like
                </h2>
            </div>

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
                    {loaded.products.map((product) => (
                        <SplideSlide key={product.id} className="py-2">
                            <ProductCard
                                product={product}
                                availableQuantity={
                                    inventory[product.masterVariant.sku ?? ''] ??
                                    product.masterVariant.availability?.availableQuantity ?? 0
                                }
                                variantQuantities={Object.fromEntries(
                                    [product.masterVariant, ...(product.variants ?? [])]
                                        .filter((variant) => variant.sku)
                                        .map((variant) => [
                                            variant.sku as string,
                                            inventory[variant.sku as string] ??
                                                variant.availability?.availableQuantity ?? 0,
                                        ]),
                                )}
                            />
                        </SplideSlide>
                    ))}
                </Splide>
            </div>

        </section>
    );
}
