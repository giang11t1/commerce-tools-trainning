'use client';

import { useState } from 'react';
import ProductCard from './ProductCard';
import Pagination from './Pagination';
import {ProductProjection} from "@commercetools/platform-sdk";
import {Squares2X2Icon} from "@heroicons/react/16/solid";
import {Bars3Icon} from "@heroicons/react/24/outline";
import type { ProductRating } from '@/lib/reviews';

type ViewMode = 'grid' | 'list';

type ProductWithRating = {
    product: ProductProjection;
    rating: ProductRating;
    availableQuantity: number;
};

interface CategoryProductListProps {
    products: ProductWithRating[];
    total: number;
    limit: number;
    currentPage: number;
}

export default function CategoryProductList({
                                                products,
                                                total,
                                                limit,
                                                currentPage,
                                            }: CategoryProductListProps) {
    const [viewMode, setViewMode] = useState<ViewMode>('grid');

    return (
        <>
            {/* View switcher */}
            <div className="hidden lg:flex justify-end mb-6">
                <div className="flex border border-[#607D8B] rounded-md">
                    <button
                        type="button"
                        onClick={() => setViewMode('grid')}
                        className={`p-3 flex items-center gap-2 rounded-l-md hover:bg-[#607D8B] hover:text-white transition-colors duration-300 cursor-pointer ${
                            viewMode === 'grid'
                                ? 'bg-[#607D8B] text-white'
                                : 'bg-white text-[#607D8B]'
                        }`}
                        aria-label="Grid view"
                        aria-pressed={viewMode === 'grid'}
                    >
                        <Squares2X2Icon className="w-5 h-5 " />
                        Grid
                    </button>

                    <button
                        type="button"
                        onClick={() => setViewMode('list')}
                        className={`p-3 flex items-center gap-2 rounded-r-md hover:bg-[#607D8B] hover:text-white transition-colors duration-300 cursor-pointer ${
                            viewMode === 'list'
                                ? 'bg-[#607D8B] text-white'
                                : 'bg-white text-[#607D8B]'
                        }`}
                        aria-label="List view"
                        aria-pressed={viewMode === 'list'}
                    >
                        <Bars3Icon className="w-5 h-5" />
                        List
                    </button>
                </div>
            </div>

            {/* Products */}
            <div
                className={
                    viewMode === 'grid'
                        ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10'
                        : 'flex flex-col gap-6'
                }
            >
                {products.map(
                    ({
                         product,
                         rating,
                         availableQuantity,
                     }: ProductWithRating) => (
                        <ProductCard
                            key={product.id}
                            product={product}
                            rating={rating}
                            availableQuantity={availableQuantity}
                            viewMode={viewMode}
                        />
                    )
                )}
            </div>

            <Pagination
                total={total}
                limit={limit}
                currentPage={currentPage}
            />
        </>
    );
}
