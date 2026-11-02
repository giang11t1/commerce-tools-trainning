'use client';

import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from 'react';

import {
    ProductProjection, ShoppingListLineItem
} from '@commercetools/platform-sdk';

export interface Wishlist {
    id: string;
    name: string;
    products: ProductProjection[];
}

interface WishlistContextType {
    wishlists: Wishlist[];
    loaded: boolean;

    createWishlist: (
        name: string
    ) => Promise<Wishlist>;

    addProductToWishlist: (
        wishlistId: string,
        product: ProductProjection
    ) => Promise<void>;

    removeProductFromWishlist: (
        wishlistId: string,
        productId: string
    ) => Promise<void>;

    removeFromWishlist: (
        wishlistId: string,
        productId: string
    ) => Promise<void>;

    isInWishlist: (
        wishlistId: string,
        productId: string
    ) => boolean;

    isProductInAnyWishlist: (
        productId: string
    ) => boolean;

    toggleWishlist: (
        product: ProductProjection
    ) => Promise<void>;

    deleteWishlist: (
        wishlistId: string
    ) => Promise<void>;

    renameWishlist: (
        wishlistId: string,
        name: string
    ) => Promise<void>;
}

const WishlistContext =
    createContext<WishlistContextType | undefined>(
        undefined
    );

interface WishlistProviderProps {
    children: React.ReactNode;
    initialWishlists?: Wishlist[];
}

export function WishlistProvider({
                                     children,
                                     initialWishlists = [],
                                 }: WishlistProviderProps) {
    const [wishlists, setWishlists] =
        useState<Wishlist[]>(
            initialWishlists.map((wishlist) => ({
                ...wishlist,
                products: wishlist.products ?? [],
            }))
        );

    const [loaded, setLoaded] = useState(
        initialWishlists.length > 0
    );

    /**
     * Normalize wishlist returned from API
     */
    const normalizeWishlist = (
        wishlist: any
    ): Wishlist => ({
        id: wishlist.id,
        name:
            typeof wishlist.name === 'string'
                ? wishlist.name
                : wishlist.name?.en ??
                Object.values(
                    wishlist.name ?? {}
                )[0] ??
                '',
        products: Array.isArray(
            wishlist.products
        )
            ? wishlist.products
            : [],
    });

    /**
     * Load wishlists from API
     */
    const loadWishlists = useCallback(
        async () => {
            try {
                const response = await fetch(
                    '/api/wishlist',
                    {
                        method: 'GET',
                        cache: 'no-store',
                    }
                );

                if (!response.ok) {
                    if (
                        response.status === 401
                    ) {
                        setWishlists([]);
                        return;
                    }

                    throw new Error(
                        'Failed to load wishlists'
                    );
                }

                const data =
                    await response.json();

                const wishlistData =
                    Array.isArray(data)
                        ? data
                        : data.wishlists ??
                        [];

                setWishlists(
                    wishlistData.map(
                        normalizeWishlist
                    )
                );
            } catch (error) {
                console.error(
                    'Failed to load wishlists:',
                    error
                );

                setWishlists([]);
            } finally {
                setLoaded(true);
            }
        },
        []
    );

    /**
     * Load wishlists when provider mounts
     */
    useEffect(() => {
        loadWishlists();
    }, [loadWishlists]);

    /**
     * Create wishlist
     */
    const createWishlist = async (
        name: string
    ): Promise<Wishlist> => {
        const response = await fetch('/api/wishlist', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || 'Failed to create wishlist'
            );
        }

        const newWishlist: Wishlist = {
            id: data.id,
            name: data.name,
            products: data.products ?? [],
        };

        setWishlists((current) => [
            ...current,
            newWishlist,
        ]);

        return newWishlist;
    };
    /**
     * Add product to wishlist
     */
    const addProductToWishlist = async (
        wishlistId: string,
        product: ProductProjection
    ): Promise<void> => {
        if (!product?.id) {
            return;
        }

        const response = await fetch(
            `/api/wishlist/${wishlistId}/products`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    productId: product.id,
                }),
            }
        );

        if (!response.ok) {
            let message = 'Failed to add product to wishlist';

            try {
                const data = await response.json();
                message = data.message ?? message;
            } catch {
                // Response is not JSON
            }

            throw new Error(message);
        }

        setWishlists((current) =>
            current.map((wishlist) => {
                if (wishlist.id !== wishlistId) {
                    return wishlist;
                }

                const alreadyExists =
                    (wishlist.products ?? []).some(
                        (item) => item.id === product.id
                    );

                if (alreadyExists) {
                    return wishlist;
                }

                return {
                    ...wishlist,
                    products: [
                        ...(wishlist.products ?? []),
                        product,
                    ],
                };
            })
        );
    };

    const removeProductFromWishlist = async (
        wishlistId: string,
        lineItemId: string
    ): Promise<void> => {
        const response = await fetch(
            `/api/wishlist/${wishlistId}/products`,
            {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    productId: lineItemId,
                }),
            }
        );

        if (!response.ok) {
            let message =
                'Failed to remove product from wishlist';

            try {
                const data = await response.json();
                message = data.message ?? message;
            } catch {}

            throw new Error(message);
        }

        setWishlists((current) =>
            current.map((wishlist) => {
                if (wishlist.id !== wishlistId) {
                    return wishlist;
                }

                return {
                    ...wishlist,
                    products: (
                        wishlist.products ?? []
                    ).filter(
                        (product) =>
                            product.id !== lineItemId
                    ),
                };
            })
        );
    };

    const deleteWishlist = async (
        wishlistId: string
    ): Promise<void> => {
        const response = await fetch(
            `/api/wishlist/${wishlistId}`,
            {
                method: 'DELETE',
            }
        );

        let data: any = {};

        try {
            data = await response.json();
        } catch {
            // Response is not JSON
        }

        if (!response.ok) {
            throw new Error(
                data.message ||
                'Failed to delete wishlist'
            );
        }

        // Update local state immediately after API succeeds
        setWishlists((current) =>
            current.filter(
                (wishlist) =>
                    wishlist.id !== wishlistId
            )
        );
    };

    const isProductInAnyWishlist = (
        productId: string
    ): boolean => {
        return wishlists.some((wishlist) =>
            (wishlist.products ?? []).some(
                (item) => item.id === productId
            )
        );
    };

    /**
     * Remove product from wishlist
     */
    const removeFromWishlist = async (
        wishlistId: string,
        lineItemId: string
    ): Promise<void> => {
        const response = await fetch(
            `/api/wishlist/${wishlistId}/products`,
            {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    productId: lineItemId,
                }),
            }
        );

        if (!response.ok) {
            let message =
                'Failed to remove product from wishlist';

            try {
                const data = await response.json();
                message = data.message ?? message;
            } catch {}

            throw new Error(message);
        }

        setWishlists((current) =>
            current.map((wishlist) => {
                if (wishlist.id !== wishlistId) {
                    return wishlist;
                }

                return {
                    ...wishlist,
                    products: (
                        wishlist.products ?? []
                    ).filter(
                        (product) =>
                            product.id !== lineItemId
                    ),
                };
            })
        );
    };

    /**
     * Check product in a specific wishlist
     */
    const isInWishlist = (
        wishlistId: string,
        productId: string
    ): boolean => {
        const wishlist =
            wishlists.find(
                (wishlist) =>
                    wishlist.id ===
                    wishlistId
            );

        return (
            wishlist?.products?.some(
                (product) =>
                    product.id ===
                    productId
            ) ?? false
        );
    };

    /**
     * Check product in any wishlist
     */


    const renameWishlist = async (
        wishlistId: string,
        name: string
    ): Promise<void> => {
        const trimmedName = name.trim();

        if (!trimmedName) {
            throw new Error(
                'Wishlist name is required'
            );
        }

        const response = await fetch(
            `/api/wishlist/${wishlistId}`,
            {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: trimmedName,
                }),
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message ||
                'Failed to rename wishlist'
            );
        }

        setWishlists((current) =>
            current.map((wishlist) =>
                wishlist.id === wishlistId
                    ? {
                        ...wishlist,
                        name: trimmedName,
                    }
                    : wishlist
            )
        );
    };

    /**
     * Toggle wishlist
     *
     * If product exists in a wishlist:
     *     remove it.
     *
     * If product does not exist:
     *     add it to the first wishlist.
     *
     * For multiple wishlists, ProductCard can
     * instead show the wishlist selection popup.
     */
    const toggleWishlist = async (
        product: ProductProjection
    ): Promise<void> => {
        const existingWishlist =
            wishlists.find((wishlist) =>
                wishlist.products.some(
                    (item) => item.id === product.id
                )
            );

        if (existingWishlist) {
            await removeFromWishlist(
                existingWishlist.id,
                product.id
            );

            return;
        }

        /*
         * No wishlist exists.
         *
         * ProductCard should show
         * Create Wishlist popup.
         */
        if (wishlists.length === 0) {
            throw new Error(
                'No wishlist available'
            );
        }

        /*
         * Product is not in any wishlist.
         * Add to first wishlist.
         */
        await addProductToWishlist(
            wishlists[0].id,
            product
        );
    };

    return (
        <WishlistContext.Provider
            value={{
                wishlists,
                loaded,

                createWishlist,

                addProductToWishlist,

                removeProductFromWishlist,

                deleteWishlist,

                renameWishlist,

                removeFromWishlist,

                isInWishlist,

                isProductInAnyWishlist,

                toggleWishlist,
            }}
        >
            {children}
        </WishlistContext.Provider>
    );
}

export function useWishlist() {
    const context =
        useContext(WishlistContext);

    if (!context) {
        throw new Error(
            'useWishlist must be used inside WishlistProvider'
        );
    }

    return context;
}
