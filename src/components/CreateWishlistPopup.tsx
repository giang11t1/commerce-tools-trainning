'use client';

import {ProductProjection} from "@commercetools/platform-sdk";
import { useLocale, useTranslations } from 'use-intl';

interface CreateWishlistPopupProps {
    setShowWishlistPopup?: (show: boolean) => void;
    setShowCreateWishlist: (show: boolean) => void;
    creatingWishlist: boolean;
    handleCreateWishlist: (e: React.FormEvent) => void;
    wishlistName: string;
    setWishlistName: (name: string) => void;
    wishlistNameError: string;
    setWishlistNameError: (error: string) => void;

    product?: ProductProjection;
}

export default function CreateWishlistPopup({
                                               setShowWishlistPopup,
                                                creatingWishlist,
                                                setShowCreateWishlist,
                                               product,
                                                handleCreateWishlist,
                                                wishlistName,
                                                setWishlistName,
                                                wishlistNameError,
                                                setWishlistNameError,
                                           }: CreateWishlistPopupProps) {
    const translate = useTranslations('wishlist');
    const locale = useLocale();
    const translateOrFallback = (key: string, fallback: string) =>
        translate.has(key) ? translate(key) : fallback;

    return (
        <div
            className="fixed inset-0 z-[110] flex items-center justify-center"
            onClick={() => {
                if (
                    !creatingWishlist
                ) {
                    setShowCreateWishlist(
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
                    <h2 className="text-xl font-semibold">
                        {translateOrFallback(
                            'create-wishlist',
                            locale === 'de' ? 'Wunschliste erstellen' : 'Create wishlist',
                        )}
                    </h2>

                    <button
                        type="button"
                        onClick={() => {
                            if (
                                !creatingWishlist
                            ) {
                                setShowCreateWishlist(
                                    false
                                );
                            }
                        }}
                        disabled={
                            creatingWishlist
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

                {/* Form */}
                <form
                    onSubmit={
                        handleCreateWishlist
                    }
                >
                    <label
                        htmlFor={`wishlist-name-${product?.id ?? 'new'}`}
                        className="block text-sm font-medium text-gray-700 mb-2"
                    >
                        {translateOrFallback(
                            'wishlist-name',
                            locale === 'de' ? 'Name der Wunschliste' : 'Wishlist name',
                        )}
                    </label>

                    <input
                        id={`wishlist-name-${product?.id ?? 'new'}`}
                        type="text"
                        value={wishlistName}
                        onChange={(e) => {
                            setWishlistName(e.target.value);
                            setWishlistNameError('');
                        }}
                        placeholder={translateOrFallback(
                            'wishlist-name-placeholder',
                            locale === 'de' ? 'z. B. Favoriten' : 'e.g. Favorites',
                        )}
                        autoFocus
                        disabled={creatingWishlist}
                        className={`w-full rounded-md border px-3 py-2 outline-none focus:ring-1 ${
                            wishlistNameError
                                ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                        } disabled:bg-gray-100`}
                    />

                    {wishlistNameError && (
                        <p className="mt-1 text-sm text-red-600">
                            {wishlistNameError}
                        </p>
                    )}

                    {/* Buttons */}
                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={() => {
                                setWishlistName(
                                    ''
                                );
                                setShowCreateWishlist(
                                    false
                                );
                                setShowWishlistPopup?.(Boolean(product));
                            }}
                            disabled={
                                creatingWishlist
                            }
                            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                            {translateOrFallback(
                                'cancel',
                                locale === 'de' ? 'Abbrechen' : 'Cancel',
                            )}
                        </button>

                        <button
                            type="submit"
                            disabled={
                                creatingWishlist ||
                                !wishlistName.trim()
                            }
                            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {creatingWishlist
                                ? translateOrFallback(
                                      'creating',
                                      locale === 'de' ? 'Wird erstellt...' : 'Creating...',
                                  )
                                : translateOrFallback(
                                      'create-wishlist',
                                      locale === 'de' ? 'Wunschliste erstellen' : 'Create wishlist',
                                  )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
