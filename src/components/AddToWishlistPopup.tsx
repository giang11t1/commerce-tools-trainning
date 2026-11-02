'use client';

import { useState } from 'react';
import {useWishlist} from "@/context/WishlistContext";
import {ProductProjection} from "@commercetools/platform-sdk";
import { useLocale, useTranslations } from 'use-intl';

interface AddToWishlistPopupProps {
    setShowWishlistPopup: (show: boolean) => void;
    setShowCreateWishlist: (show: boolean) => void;
    product?: ProductProjection;
    createOnly?: boolean;
    moveFromWishlistId?: string;
}

export default function AddToWishlistPopup({
                                               setShowWishlistPopup,
                                                setShowCreateWishlist,
                                               product,
                                               createOnly = false,
                                               moveFromWishlistId,
                                            }: AddToWishlistPopupProps) {
    const translate = useTranslations('wishlist');
    const locale = useLocale();
    const translateOrFallback = (key: string, fallback: string) =>
        translate.has(key) ? translate(key) : fallback;

    const {
        wishlists,
        loaded,
        addProductToWishlist,
        removeProductFromWishlist,
    } = useWishlist();

    const [addingToWishlist, setAddingToWishlist] =
        useState(false);
    const [selectedWishlistId, setSelectedWishlistId] =
        useState<string | null>(null);
    const [moveError, setMoveError] = useState(false);

    const handleAddToWishlist = async (
        wishlistId: string
    ) => {
        if (addingToWishlist || !product) {
            return;
        }

        try {
            setAddingToWishlist(true);
            setSelectedWishlistId(wishlistId);

            await addProductToWishlist(
                wishlistId,
                product
            );


            setShowWishlistPopup(false);
        } catch (error) {
            console.error(
                'Failed to add product to wishlist:',
                error
            );
        } finally {
            setAddingToWishlist(false);
            setSelectedWishlistId(null);
        }
    };

    const handleMoveToWishlist = async (wishlistId: string) => {
        if (addingToWishlist || !product || !moveFromWishlistId) {
            return;
        }

        const destination = wishlists.find((wishlist) => wishlist.id === wishlistId);
        const alreadyInDestination = destination?.products.some((item) => item.id === product.id);
        let addedToDestination = false;

        try {
            setAddingToWishlist(true);
            setSelectedWishlistId(wishlistId);
            setMoveError(false);

            if (!alreadyInDestination) {
                await addProductToWishlist(wishlistId, product);
                addedToDestination = true;
            }

            try {
                await removeProductFromWishlist(moveFromWishlistId, product.id);
            } catch (error) {
                if (addedToDestination) {
                    await removeProductFromWishlist(wishlistId, product.id).catch((rollbackError) => {
                        console.error('Failed to roll back wishlist move:', rollbackError);
                    });
                }
                throw error;
            }

            setShowWishlistPopup(false);
        } catch (error) {
            console.error('Failed to move product between wishlists:', error);
            setMoveError(true);
        } finally {
            setAddingToWishlist(false);
            setSelectedWishlistId(null);
        }
    };


    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center"
            onClick={() => {
                if (
                    !addingToWishlist
                ) {
                    setShowWishlistPopup(
                        false
                    );
                }
            }}
        >
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/50" />

            {/* Modal */}
            <div
                className="relative z-10 w-full max-w-md mx-4 rounded-lg bg-white p-6 shadow-xl"
                onClick={(e) =>
                    e.stopPropagation()
                }
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h2 className="text-xl font-semibold">
                            {moveFromWishlistId
                                ? translateOrFallback(
                                      'move-item-to-wishlist',
                                      locale === 'de' ? 'In eine andere Wunschliste verschieben' : 'Move to another wishlist',
                                  )
                                : createOnly
                                ? translate('my-wishlist')
                                : translate('add-to-wishlist')}
                        </h2>

                        <p className="text-sm text-gray-500 mt-1">
                            {moveFromWishlistId
                                ? translateOrFallback(
                                      'move-item-prompt',
                                      locale === 'de'
                                          ? 'Wählen Sie eine Ziel-Wunschliste. Der Artikel wird aus dieser Liste entfernt.'
                                          : 'Choose a destination wishlist. The item will be removed from this one.',
                                  )
                                : createOnly
                                ? translateOrFallback(
                                      'wishlist-existing-lists-prompt',
                                      locale === 'de'
                                          ? 'Ihre vorhandenen Wunschlisten sind unten aufgeführt. Bei Bedarf können Sie eine weitere erstellen.'
                                          : 'Your existing wishlists are listed below. Create another wishlist if you need one.',
                                  )
                                : translateOrFallback(
                                      'choose-wishlist',
                                      locale === 'de' ? 'Wunschliste auswählen' : 'Choose a wishlist',
                                  )}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() =>
                            setShowWishlistPopup(
                                false
                            )
                        }
                        disabled={
                            addingToWishlist
                        }
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                        aria-label="Close"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={
                                    2
                                }
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>

                {/* Wishlist list */}
                {!loaded ? (
                    <div className="py-6 text-center">
                        <p className="text-sm text-gray-500">
                            Loading wishlists...
                        </p>
                    </div>
                ) : wishlists.length > 0 ? (
                    <div className="space-y-2">
                        {wishlists.map(
                            (
                                wishlist
                            ) => {
                                if (moveFromWishlistId && wishlist.id === moveFromWishlistId) {
                                    return null;
                                }

                                if (createOnly || !product) {
                                    return (
                                        <div
                                            key={wishlist.id}
                                            className="flex w-full items-center justify-between rounded-md border border-gray-200 px-4 py-3"
                                        >
                                            <span className="font-medium">{wishlist.name}</span>
                                            <span className="text-sm text-gray-500">
                                                {wishlist.products?.length ?? 0} items
                                            </span>
                                        </div>
                                    );
                                }

                                const isLoading =
                                    addingToWishlist &&
                                    selectedWishlistId ===
                                    wishlist.id;

                                    const alreadyAdded =
                                    wishlist.products?.some(
                                        (
                                            item
                                        ) =>
                                            item.id ===
                                            product.id
                                    );

                                return (
                                    <button
                                        key={
                                            wishlist.id
                                        }
                                        type="button"
                                        disabled={
                                            addingToWishlist ||
                                            (alreadyAdded && !moveFromWishlistId)
                                        }
                                        onClick={() => moveFromWishlistId
                                            ? handleMoveToWishlist(wishlist.id)
                                            : handleAddToWishlist(wishlist.id)}
                                        className="flex w-full items-center justify-between rounded-md border border-gray-200 px-4 py-3 text-left transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <div className="flex items-center gap-3">
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                className="h-5 w-5 text-red-500"
                                                fill={
                                                    alreadyAdded
                                                        ? 'currentColor'
                                                        : 'none'
                                                }
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={
                                                        2
                                                    }
                                                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                                                />
                                            </svg>

                                            <span className="font-medium">
                                                        {
                                                            wishlist.name
                                                        }
                                                    </span>
                                        </div>

                                        {isLoading ? (
                                            <span className="text-sm text-gray-400">
                                                {moveFromWishlistId
                                                    ? translateOrFallback('moving-item', locale === 'de' ? 'Wird verschoben...' : 'Moving...')
                                                    : 'Adding...'}
                                                    </span>
                                        ) : alreadyAdded ? (
                                            <span className="text-sm text-green-600">
                                                {moveFromWishlistId
                                                    ? translateOrFallback('item-already-in-wishlist', locale === 'de' ? 'Artikel bereits enthalten' : 'Item already included')
                                                    : 'Added'}
                                                    </span>
                                        ) : (
                                            <span className="text-sm text-gray-400">
                                                        {wishlist
                                                                .products
                                                                ?.length ??
                                                            0}{' '}
                                                items
                                                    </span>
                                        )}
                                    </button>
                                );
                            }
                        )}
                    </div>
                ) : (
                    <div className="rounded-md bg-gray-50 p-4 text-center">
                        <p className="text-sm text-gray-500">
                            You don&apos;t have
                            any wishlists
                            yet.
                        </p>
                    </div>
                )}

                {moveError && (
                    <p className="mt-3 text-sm text-red-600" role="alert">
                        {translateOrFallback(
                            'move-item-error',
                            locale === 'de' ? 'Der Artikel konnte nicht verschoben werden. Bitte versuchen Sie es erneut.' : 'Could not move this item. Please try again.',
                        )}
                    </p>
                )}

                {/* Create new wishlist */}
                {!moveFromWishlistId && <button
                    type="button"
                    onClick={() => {
                        setShowWishlistPopup(
                            false
                        );
                        setShowCreateWishlist(
                            true
                        );
                    }}
                    className="mt-4 w-full rounded-md border border-blue-600 px-4 py-3 text-sm font-medium text-blue-600 hover:bg-blue-50"
                >
                    + {translateOrFallback(
                        'create-new-wishlist',
                        locale === 'de' ? 'Neue Wunschliste erstellen' : 'Create new wishlist',
                    )}
                </button>}
            </div>
        </div>
    );
}
