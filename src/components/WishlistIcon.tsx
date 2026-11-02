'use client';

import React from 'react';
import Link from '@/components/commercetools-ui/atoms/link';
import { useWishlist } from '@/context/WishlistContext';

export default function WishlistIcon() {
    const { wishlists } = useWishlist();

    const wishlistCount = new Set(
        (wishlists ?? []).flatMap((wishlist) =>
            (wishlist.products ?? []).map(
                (product) => product.id
            )
        )
    ).size;

    return (
        <Link
            link="/account/wishlist"
            className="p-2 text-gray-600 hover:text-blue-600 transition-colors relative"
            title="Wishlist"
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
            </svg>

            {wishlistCount > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
                    {wishlistCount}
                </span>
            )}
        </Link>
    );
}
