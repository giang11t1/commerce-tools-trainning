'use client';

import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from 'react';

import {
    ProductProjection,
} from '@commercetools/platform-sdk';
import { useLocale } from 'use-intl';

export interface WishlistLineItem {
    id: string;
    productId: string;
    variantId: number;
    quantity: number;
    product: ProductProjection;
    isTextLineItem?: boolean;
}

export interface Wishlist {
    id: string;
    name: string;
    products: ProductProjection[];
    lineItems: WishlistLineItem[];
}

interface WishlistContextType {
    wishlists: Wishlist[];
    loaded: boolean;
    loadError: string | null;
    reloadWishlists: () => Promise<void>;

    createWishlist: (
        name: string
    ) => Promise<Wishlist>;

    addProductToWishlist: (
        wishlistId: string,
        product: ProductProjection,
        variantId?: number,
        quantity?: number,
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

    updateLineItemQuantity: (
        wishlistId: string,
        lineItemId: string,
        quantity: number
    ) => Promise<void>;
}

function normalizeWishlist(value: unknown): Wishlist {
    const wishlist = value as {
        id?: unknown;
        name?: unknown;
        products?: unknown;
        lineItems?: unknown;
    };
    const name = wishlist.name;
    const products = Array.isArray(wishlist.products)
        ? wishlist.products as ProductProjection[]
        : [];
    const lineItems = Array.isArray(wishlist.lineItems)
        ? wishlist.lineItems as WishlistLineItem[]
        : products.map((product) => ({
            id: product.id,
            productId: product.id,
            variantId: product.masterVariant?.id ?? 1,
            quantity: 1,
            product,
        }));

    return {
        id: typeof wishlist.id === 'string' ? wishlist.id : '',
        name: typeof name === 'string'
            ? name
            : name && typeof name === 'object'
                ? (name as Record<string, string>).en ??
                  Object.values(name as Record<string, string>)[0] ??
                  ''
                : '',
        products,
        lineItems,
    };
}

async function fetchWishlists(locale: string): Promise<Wishlist[]> {
    const response = await fetch(
        `/api/wishlist?locale=${encodeURIComponent(locale)}`,
        { method: 'GET', cache: 'no-store' },
    );

    if (response.status === 401) {
        return [];
    }

    const data = await response.json().catch(() => null) as
        | unknown[]
        | { wishlists?: unknown[]; message?: string }
        | null;
    if (!response.ok) {
        throw new Error(
            data && !Array.isArray(data)
                ? data.message ?? 'Failed to load shopping lists'
                : 'Failed to load shopping lists',
        );
    }

    const wishlistData = Array.isArray(data)
        ? data
        : data?.wishlists ?? [];

    return wishlistData.map(normalizeWishlist);
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
    const locale = useLocale();
    const [wishlists, setWishlists] =
        useState<Wishlist[]>(
            initialWishlists.map((wishlist) => ({
                ...wishlist,
                products: wishlist.products ?? [],
                lineItems: wishlist.lineItems ?? [],
            }))
        );

    const [loaded, setLoaded] = useState(initialWishlists.length > 0);
    const [loadError, setLoadError] = useState<string | null>(null);

    const reloadWishlists = useCallback(
        async () => {
            try {
                const lists = await fetchWishlists(locale);
                setWishlists(lists);
                setLoadError(null);
            } catch (error) {
                console.error('Failed to load shopping lists:', error);
                setLoadError(
                    error instanceof Error
                        ? error.message
                        : 'Failed to load shopping lists',
                );
            } finally {
                setLoaded(true);
            }
        },
        [locale]
    );

    useEffect(() => {
        let cancelled = false;

        void fetchWishlists(locale)
            .then((lists) => {
                if (!cancelled) {
                    setWishlists(lists);
                    setLoadError(null);
                }
            })
            .catch((error: unknown) => {
                if (!cancelled) {
                    console.error('Failed to load shopping lists:', error);
                    setLoadError(
                        error instanceof Error
                            ? error.message
                            : 'Failed to load shopping lists',
                    );
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setLoaded(true);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [locale]);

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

        const data = await response.json() as {
            id: string;
            name: string;
            products?: ProductProjection[];
            lineItems?: WishlistLineItem[];
            message?: string;
        };

        if (!response.ok) {
            throw new Error(
                data.message || 'Failed to create wishlist'
            );
        }

        const newWishlist: Wishlist = {
            id: data.id,
            name: data.name,
            products: data.products ?? [],
            lineItems: data.lineItems ?? [],
        };

        setWishlists((current) => [
            ...current,
            newWishlist,
        ]);

        return newWishlist;
    };
    const addProductToWishlist = async (
        wishlistId: string,
        product: ProductProjection,
        variantId?: number,
        quantity = 1,
    ): Promise<void> => {
        if (
            !product?.id ||
            !Number.isInteger(quantity) ||
            quantity < 1 ||
            quantity > 999 ||
            (variantId !== undefined && !Number.isInteger(variantId))
        ) {
            throw new Error('Invalid shopping list item');
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
                    variantId,
                    quantity,
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

        await reloadWishlists();
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
                lineItemId: wishlists
                    .find((wishlist) => wishlist.id === wishlistId)
                    ?.lineItems.find(
                        (item) => item.id === lineItemId || item.productId === lineItemId
                    )?.id,
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

        await reloadWishlists();
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

        let data: { message?: string } = {};

        try {
            data = await response.json() as { message?: string };
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
                lineItemId: wishlists
                    .find((wishlist) => wishlist.id === wishlistId)
                    ?.lineItems.find(
                        (item) => item.id === lineItemId || item.productId === lineItemId
                    )?.id,
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

        await reloadWishlists();
    };

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

        const data = await response.json() as { message?: string };

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

    const updateLineItemQuantity = async (
        wishlistId: string,
        lineItemId: string,
        quantity: number,
    ): Promise<void> => {
        if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) {
            throw new Error('Quantity must be between 1 and 999');
        }

        const response = await fetch(
            `/api/wishlist/${wishlistId}/products`,
            {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lineItemId, quantity }),
            },
        );
        const data = await response.json() as { message?: string };

        if (!response.ok) {
            throw new Error(data.message ?? 'Failed to update item quantity');
        }

        await reloadWishlists();
    };

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
                loadError,
                reloadWishlists,

                createWishlist,

                addProductToWishlist,

                removeProductFromWishlist,

                deleteWishlist,

                renameWishlist,
                updateLineItemQuantity,

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
