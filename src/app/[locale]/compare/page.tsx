'use client';

import { useEffect, useMemo, useState } from 'react';
import { useCompare } from '@/context/CompareContext';
import ProductCard from '@/components/ProductCard';
import { getCompareProducts } from '@/lib/products';
import { useLocale } from 'use-intl';
import type { ProductProjection } from '@commercetools/platform-sdk';
import type { ProductRating } from '@/lib/reviews';

type CompareProductData = {
    product: ProductProjection;
    rating: ProductRating;
    availableQuantity: number;
    variantQuantities: Record<string, number>;
    storeAvailable: boolean;
};

export default function ComparePage() {
    const {
        compareProducts,
        clearCompare,
        removeFromCompare,
    } = useCompare();
    const locale = useLocale();
    const [loadedData, setLoadedData] = useState<{
        key: string;
        products: CompareProductData[];
    } | null>(null);
    const [loadErrorKey, setLoadErrorKey] = useState<string | null>(null);
    const [retryAttempt, setRetryAttempt] = useState(0);

    const uniqueProducts = useMemo(
        () =>
            compareProducts.filter(
                (product, index, products) =>
                    product?.id &&
                    products.findIndex((item) => item.id === product.id) === index,
            ),
        [compareProducts],
    );
    const productIds = uniqueProducts.map((product) => product.id);
    const productIdsKey = productIds.join(',');

    useEffect(() => {
        if (!productIdsKey) {
            return;
        }

        let cancelled = false;
        const ids = productIdsKey.split(',');

        getCompareProducts(ids, locale)
            .then((products) => {
                if (cancelled) return;

                const productsById = new Map(
                    products.map((item) => [item.product.id, item]),
                );
                ids
                    .filter((id) => !productsById.has(id))
                    .forEach(removeFromCompare);
                setLoadedData({
                    key: productIdsKey,
                    products: ids.flatMap((id) => {
                        const item = productsById.get(id);
                        return item ? [item] : [];
                    }),
                });
                setLoadErrorKey(null);
            })
            .catch((error: unknown) => {
                if (!cancelled) {
                    console.error('Failed to load compare product details:', error);
                    setLoadErrorKey(productIdsKey);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [locale, productIdsKey, removeFromCompare, retryAttempt]);

    if (!uniqueProducts.length) {
        return (
            <div>
                <h1>Compare Products</h1>

                <p>No products to compare.</p>
            </div>
        );
    }

    const currentProductData =
        loadedData?.key === productIdsKey ? loadedData.products : [];
    const productsById = new Map(
        currentProductData.map((item) => [item.product.id, item]),
    );
    const displayedProducts = uniqueProducts.flatMap((product) => {
        const data = productsById.get(product.id);
        return data ? [data] : [];
    });

    return (
        <div>
            <div className="mt-20 mb-10 flex items-center justify-between">
                <h1 className="text-2xl font-bold">
                    Compare Products
                </h1>

                <button
                    type="button"
                    className="font-medium text-red-600 hover:underline cursor-pointer"
                    onClick={clearCompare}
                >
                    Clear all
                </button>
            </div>

            {loadErrorKey === productIdsKey && (
                <div className="mb-4 text-red-700" role="alert">
                    <p>Could not load current product details.</p>
                    <button
                        type="button"
                        className="mt-1 underline"
                        onClick={() => setRetryAttempt((attempt) => attempt + 1)}
                    >
                        Try again
                    </button>
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] border-collapse">
                    <tbody>
                    {/* Product */}
                    <tr>
                        <th className="min-w-40 border p-4 text-left align-top">
                            Product
                        </th>

                        {displayedProducts.map(({ product, rating, availableQuantity, variantQuantities, storeAvailable }) => (
                            <td
                                key={product.id}
                                className="border p-4 align-top w-85 min-w-[340px]"
                            >
                                <ProductCard
                                    product={product}
                                    rating={rating}
                                    availableQuantity={availableQuantity}
                                    variantQuantities={variantQuantities}
                                    storeAvailable={storeAvailable}
                                />
                            </td>
                        ))}
                    </tr>

                    {/* SKU */}
                    <tr>
                        <th className="border p-4 text-left align-top min-w-40">
                            SKU
                        </th>

                        {displayedProducts.map(({ product }) => (
                            <td
                                key={product.id}
                                className="border p-4 align-top w-85 min-w-[340px]"
                            >
                                {product.masterVariant?.sku || '-'}
                            </td>
                        ))}
                    </tr>

                    {/* Description */}
                    <tr>
                        <th className="border p-4 text-left align-top min-w-40">
                            Description
                        </th>

                        {displayedProducts.map(({ product }) => (
                            <td
                                key={product.id}
                                className="border p-4 align-top w-85 min-w-[340px]"
                            >
                                {product.description?.[locale === 'de' ? 'de-DE' : 'en-US'] ||
                                    product.description?.['en-US'] ||
                                    Object.values(product.description ?? {})[0] ||
                                    '-'}
                            </td>
                        ))}
                    </tr>

                    <tr>
                        <th className="border p-4 text-left align-top min-w-40">
                            Rating
                        </th>
                        {displayedProducts.map(({ product, rating }) => (
                            <td
                                key={product.id}
                                className="border p-4 align-top w-85 min-w-[340px]"
                            >
                                {rating.reviewCount
                                    ? `${rating.averageRating.toFixed(1)} / 5 (${rating.reviewCount})`
                                    : '-'}
                            </td>
                        ))}
                    </tr>
                    </tbody>
                </table>
            </div>

            {loadedData?.key !== productIdsKey && loadErrorKey !== productIdsKey && (
                <p className="mt-4 text-gray-600" role="status">
                    Loading current product details…
                </p>
            )}
            {loadedData?.key === productIdsKey &&
                displayedProducts.length < uniqueProducts.length && (
                    <p className="mt-4 text-gray-600" role="status">
                        Some products are no longer available and were omitted.
                    </p>
                )}
        </div>
    );
}
