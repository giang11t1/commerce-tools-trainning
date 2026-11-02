'use client';

import React, {useEffect, useState} from 'react';
import { ProductProjection } from '@commercetools/platform-sdk';
import { useWishlist } from '@/context/WishlistContext';
import { useTranslations } from 'use-intl';
import AddToWishlistPopup from "@/components/AddToWishlistPopup";
import CreateWishlistPopup from "@/components/CreateWishlistPopup";

interface WishlistButtonProps {
    product: ProductProjection;
    className?: string;
}

export default function WishlistButton({ product, className = '' }: WishlistButtonProps) {
    const translate = useTranslations();
    const {
        wishlists,
        createWishlist,
        isProductInAnyWishlist,
    } = useWishlist();

    const [showWishlistPopup, setShowWishlistPopup] =
        useState(false);

    const [showCreateWishlist, setShowCreateWishlist] =
        useState(false);

    const [wishlistName, setWishlistName] =
        useState('');

    const [creatingWishlist, setCreatingWishlist] =
        useState(false);

    const isWishlisted =
        isProductInAnyWishlist(product.id);


    const [wishlistNameError, setWishlistNameError] =
        useState('');

    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [checkingSession, setCheckingSession] = useState(true);

    useEffect(() => {
        const checkSession = async () => {
            try {
                const response = await fetch('/api/auth/session');

                if (!response.ok) {
                    setIsLoggedIn(false);
                    return;
                }

                const data = await response.json();

                setIsLoggedIn(data.isLoggedIn);
            } catch (error) {
                console.error(
                    'Failed to check customer session:',
                    error
                );

                setIsLoggedIn(false);
            } finally {
                setCheckingSession(false);
            }
        };

        checkSession();
    }, []);



    /**
     * Open wishlist selection popup
     */
    const handleWishlistClick = (
        e: React.MouseEvent<HTMLButtonElement>
    ) => {
        e.preventDefault();
        e.stopPropagation();

        if (!isLoggedIn) {
            const currentUrl =
                window.location.pathname +
                window.location.search;

            window.location.href = `/login?redirect=${encodeURIComponent(
                currentUrl
            )}`;

            return;
        }

        setShowWishlistPopup(true);
    };

    /**
     * Create a new wishlist
     */
    const handleCreateWishlist = async (
        e: React.FormEvent
    ) => {
        e.preventDefault();

        const name = wishlistName.trim();

        if (!name) {
            return;
        }

        // Check duplicate wishlist name
        const isDuplicate = wishlists.some(
            (wishlist) =>
                wishlist.name.trim().toLowerCase() ===
                name.toLowerCase()
        );

        if (isDuplicate) {
            setWishlistNameError(
                'A wishlist with this name already exists.'
            );
            return;
        }

        try {
            setCreatingWishlist(true);
            setWishlistNameError('');

            await createWishlist(name);

            setWishlistName('');
            setShowCreateWishlist(false);
            setShowWishlistPopup(true);
        } catch (error) {
            setWishlistNameError(
                error instanceof Error
                    ? error.message
                    : 'Failed to create wishlist. Please try again.'
            );
            console.error(
                'Failed to create wishlist:',
                error
            );
        } finally {
            setCreatingWishlist(false);
        }
    };

    return (
        <>
            <button
                onClick={handleWishlistClick}
                className={`flex items-center justify-center gap-2 px-4 py-3 border rounded-md font-medium transition-all whitespace-nowrap ${
                    isWishlisted
                        ? 'border-red-600 bg-red-50 text-red-600'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                } ${className}`}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-5 w-5 ${isWishlisted ? 'fill-red-600' : 'fill-none'}`}
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
                {isWishlisted ? 'In Wishlist' : translate('wishlist.add-to-wishlist')}
            </button>

            {showWishlistPopup && (
                <AddToWishlistPopup product={product} setShowWishlistPopup={setShowWishlistPopup} setShowCreateWishlist={setShowCreateWishlist} />
            )}

            {showCreateWishlist && (
                <CreateWishlistPopup
                    creatingWishlist={creatingWishlist}
                    setShowWishlistPopup={setShowWishlistPopup}
                    setShowCreateWishlist={setShowCreateWishlist}
                    handleCreateWishlist={handleCreateWishlist}
                    wishlistName={wishlistName}
                    setWishlistName={setWishlistName}
                    wishlistNameError={wishlistNameError}
                    setWishlistNameError={setWishlistNameError}
                    product={product}
                />
            )}

        </>
    );
}
