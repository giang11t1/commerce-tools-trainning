'use client';

import React, {
    createContext,
    useContext,
    useState,
    useCallback,
    useEffect,
} from 'react';
import { useLocale } from 'use-intl';

import {
    addToCart as addToCartAction,
    removeFromCart as removeFromCartAction,
    updateCartQuantity as updateCartQuantityAction,
    applyCoupon as applyCouponAction,
    removeCoupon as removeCouponAction,
    updateCartAddress as updateCartAddressAction,
    syncCartForCurrentMarket,
    type CartActionResult,
} from '../app/api/cart/actions';

import type {
    Cart,
    Address,
} from '@commercetools/platform-sdk';
import { getCommerceMarket } from '@/lib/commerce-market';

export const CART_ITEM_ADDED_EVENT = 'cart:item-added';

interface CartContextType {
    cart: Cart | null;
    cartCount: number;

    addToCart: (
        productId: string,
        variantId: number,
        quantity?: number,
    ) => Promise<void>;

    removeFromCart: (
        lineItemId: string,
    ) => Promise<void>;

    updateCartQuantity: (
        lineItemId: string,
        quantity: number,
    ) => Promise<void>;

    applyCoupon: (
        code: string,
    ) => Promise<Cart>;

    removeCoupon: (
        discountCodeId: string,
    ) => Promise<void>;

    replaceCart: (cart: Cart) => void;
    marketSyncError: boolean;

    updateCartAddress: (
        address: Address,
    ) => Promise<void>;

    /**
     * Reset the cart on the client, e.g. after the cart was
     * turned into a quote request.
     */
    clearCart: () => void;
}

const CartContext =
    createContext<CartContextType | undefined>(
        undefined
    );

export function CartProvider({
                                 children,
                                 initialCart,
                             }: {
    children: React.ReactNode;
    initialCart: Cart | null;
}) {
    const [cart, setCart] =
        useState<Cart | null>(initialCart);
    const [marketSyncErrorMarket, setMarketSyncErrorMarket] = useState<string | null>(null);
    const locale = useLocale();
    const currentMarket = getCommerceMarket(locale);
    const currentMarketKey = `${currentMarket.currency}:${currentMarket.country}`;

    useEffect(() => {
        if (!cart) return;
        const market = getCommerceMarket(locale);
        if (
            cart.totalPrice.currencyCode === market.currency &&
            cart.country === market.country
        ) {
            return;
        }

        let cancelled = false;
        syncCartForCurrentMarket().then((result) => {
            if (cancelled) return;
            if (result.cart) {
                setMarketSyncErrorMarket(null);
                setCart(result.cart);
            } else {
                setMarketSyncErrorMarket(currentMarketKey);
                console.error('Unable to sync cart with the current market:', result.error);
            }
        }).catch((error: unknown) => {
            if (!cancelled) {
                setMarketSyncErrorMarket(currentMarketKey);
                console.error('Unable to sync cart with the current market:', error);
            }
        });

        return () => {
            cancelled = true;
        };
    }, [cart, currentMarketKey, locale]);

    /**
     * Store the updated cart, or throw the server error so the
     * calling component can display it.
     */
    const applyResult = (result: CartActionResult): Cart => {
        if (result.error || !result.cart) {
            throw new Error(result.error ?? 'Cart update failed');
        }

        setMarketSyncErrorMarket(null);
        setCart(result.cart);
        return result.cart;
    };

    /**
     * Add product to commercetools Cart.
     *
     * The price is NOT passed here.
     * commercetools resolves the price based on:
     *
     * Customer
     *   -> Customer Group
     *   -> Product Price
     */
    const addToCart = async (
        productId: string,
        variantId: number,
        quantity = 1,
    ) => {
        applyResult(
            await addToCartAction({
                productId,
                variantId,
                quantity,
            }),
        );

        if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event(CART_ITEM_ADDED_EVENT));
        }
    };

    /**
     * Remove line item
     */
    const removeFromCart = async (
        lineItemId: string,
    ) => {
        applyResult(
            await removeFromCartAction(
                lineItemId
            ),
        );
    };

    /**
     * Update quantity
     */
    const updateCartQuantity = async (
        lineItemId: string,
        quantity: number,
    ) => {
        if (quantity <= 0) {
            await removeFromCart(lineItemId);
            return;
        }

        applyResult(
            await updateCartQuantityAction(
                lineItemId,
                quantity,
            ),
        );
    };

    /**
     * Apply discount code
     */
    const applyCoupon = async (
        code: string,
    ) => {
        return applyResult(await applyCouponAction(code));
    };

    const removeCoupon = async (discountCodeId: string) => {
        applyResult(await removeCouponAction(discountCodeId));
    };

    /**
     * Update shipping / billing address.
     *
     * This is important for tax calculation.
     */
    const updateCartAddress = async (address: Address) => {
        applyResult(
            await updateCartAddressAction(address),
        );
    };

    const clearCart = () => {
        setMarketSyncErrorMarket(null);
        setCart(null);
    };

    const replaceCart = useCallback((updatedCart: Cart) => {
        setMarketSyncErrorMarket(null);
        setCart(updatedCart);
    }, []);

    const cartCount =
        cart?.lineItems.reduce(
            (total, item) =>
                total + item.quantity,
            0,
        ) ?? 0;

    return (
        <CartContext.Provider
            value={{
                cart,
                cartCount,

                addToCart,
                removeFromCart,
                updateCartQuantity,
                applyCoupon,
                removeCoupon,
                updateCartAddress,
                replaceCart,
                marketSyncError: marketSyncErrorMarket === currentMarketKey,
                clearCart,
            }}
        >
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context =
        useContext(CartContext);

    if (!context) {
        throw new Error(
            'useCart must be used inside CartProvider'
        );
    }

    return context;
}
