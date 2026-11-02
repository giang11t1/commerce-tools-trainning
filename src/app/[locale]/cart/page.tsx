'use client';

import Link from '@/components/commercetools-ui/atoms/link';
import {
    getCartDiscountAmount,
    getCartShippingDiscount,
    getCartShippingOriginalPrice,
    getCartShippingPrice,
    getCartTaxAmount,
    getSubtotalMoney,
    getTaxBasis,
} from '@/lib/checkout-utils';
import {
    getAddedCouponState,
    getCouponApplyStatus,
    getCouponErrorTranslationKey,
} from '@/lib/coupon-utils';
import PriceDisplay from '@/components/PriceDisplay';
import {useCart} from '../../../context/CartContext';
import RelatedProducts from '@/components/cart/RelatedProducts';
import {useEffect, useMemo, useState} from 'react';
import {getRelatedProductsForCartItems} from "@/lib/products";
import type {ProductProjection} from '@commercetools/platform-sdk';
import ConfirmDialog from '@/components/ConfirmDialog';
import RequestQuoteForm from '@/components/cart/RequestQuoteForm';
import { useLocale, useTranslations } from 'use-intl';

export default function CartPage() {
    const {
        cart,
        removeFromCart,
        updateCartQuantity,
        cartCount,
        applyCoupon,
        removeCoupon,
    } = useCart();
    const locale = useLocale();
    const translate = useTranslations('checkout');

    const [relatedProducts, setRelatedProducts] =
        useState<ProductProjection[]>([]);

    // Memoized so the related-products effect does not re-run on every render
    // when there is no cart (a new [] would be created each time).
    const lineItems = useMemo(() => cart?.lineItems ?? [], [cart]);

    const [couponCode, setCouponCode] = useState('');
    const [couponError, setCouponError] = useState('');
    const [appliedCouponId, setAppliedCouponId] = useState<string | null>(null);
    const [appliedCouponCode, setAppliedCouponCode] = useState('');
    const [removingCouponId, setRemovingCouponId] = useState<string | null>(null);
    const [isApplyingCoupon, setIsApplyingCoupon] =
        useState(false);

    const [itemToRemove, setItemToRemove] = useState<string | null>(null);
    const [isRemoving, setIsRemoving] = useState(false);
    const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
    const [cartError, setCartError] = useState<string | null>(null);

    const handleConfirmRemove = async () => {
        if (!itemToRemove) return;

        try {
            setIsRemoving(true);

            await removeFromCart(itemToRemove);

            setItemToRemove(null);
        } catch (error) {
            console.error('Failed to remove cart item:', error);
            setCartError(error instanceof Error ? error.message : 'Unable to remove item');
        } finally {
            setIsRemoving(false);
        }
    };

    // Quantity 0 removes the line item (handled in CartContext).
    const handleQuantityChange = async (lineItemId: string, quantity: number) => {
        setCartError(null);
        setUpdatingItemId(lineItemId);

        try {
            await updateCartQuantity(lineItemId, quantity);
        } catch (error) {
            console.error('Failed to update cart quantity:', error);
            setCartError(error instanceof Error ? error.message : 'Unable to update quantity');
        } finally {
            setUpdatingItemId(null);
        }
    };

    const handleApplyCoupon = async () => {
        const code = couponCode;

        if (!code.trim()) {
            setCouponError(translate('couponEmpty'));
            return;
        }

        setCouponError('');
        setIsApplyingCoupon(true);

        try {
            const previousCart = cart;
            const updatedCart = await applyCoupon(code);
            const addedCoupon = previousCart
                ? getAddedCouponState(previousCart, updatedCart)
                : undefined;

            if (!addedCoupon) {
                setCouponError(translate('couponNotConfirmed'));
                return;
            }

            setAppliedCouponId(addedCoupon.id);
            setAppliedCouponCode(code);
            setCouponCode(code);
            if (addedCoupon.state !== 'MatchesCart') {
                setCouponError(translate('couponNotApplicable'));
            } else {
                setCouponError('');
            }
        } catch (error) {
            console.error('Failed to apply coupon:', error);
            const errorKey =
                error instanceof Error
                    ? getCouponErrorTranslationKey(error.message)
                    : undefined;
            setCouponError(translate(errorKey ?? 'couponErrorUnknown'));
        } finally {
            setIsApplyingCoupon(false);
        }
    };

    const handleRemoveCoupon = async (discountCodeId: string) => {
        setCouponError('');
        setRemovingCouponId(discountCodeId);

        try {
            await removeCoupon(discountCodeId);
            if (appliedCouponId === discountCodeId) {
                setAppliedCouponId(null);
                setAppliedCouponCode('');
                setCouponCode('');
            }
        } catch (error) {
            console.error('Failed to remove coupon:', error);
            const errorKey =
                error instanceof Error
                    ? getCouponErrorTranslationKey(error.message)
                    : undefined;
            setCouponError(translate(errorKey ?? 'couponErrorRemoveFailed'));
        } finally {
            setRemovingCouponId(null);
        }
    };


    /**
     * Calculate subtotal from commercetools line items.
     * Money values are stored in cents.
     */
    const subtotalMoney = getSubtotalMoney(lineItems);
    const discountMoney = cart ? getCartDiscountAmount(cart) : undefined;
    const shippingMoney = cart ? getCartShippingPrice(cart) : undefined;
    const originalShippingMoney = cart ? getCartShippingOriginalPrice(cart) : undefined;
    const shippingDiscountMoney = cart ? getCartShippingDiscount(cart) : undefined;
    const taxMoney = cart ? getCartTaxAmount(cart) : undefined;
    const taxBasis = cart ? getTaxBasis(cart) : 'unknown';
    const selectedCoupon = cart?.discountCodes.find(
        ({ discountCode }) => discountCode.id === appliedCouponId,
    );
    const couponApplyStatus = selectedCoupon
        ? getCouponApplyStatus(
              selectedCoupon.state,
              Boolean(cart?.shippingInfo?.shippingMethod),
          )
        : undefined;

    /**
     * Related products
     *
     * NOTE:
     * commercetools LineItem does not automatically contain
     * your old `categoryIds` / `productSlug` fields.
     *
     * If your RelatedProducts API requires categoryIds,
     * we should add those to the cart line item as custom
     * fields or retrieve the products separately.
     */
    useEffect(() => {
        if (!lineItems.length) {
            return;
        }

        const productIds = lineItems.map(
            (item) => item.productId,
        );

        let cancelled = false;

        async function loadRelatedProducts() {
            try {
                const products =
                    await getRelatedProductsForCartItems(productIds);

                if (!cancelled) {
                    setRelatedProducts(products);
                }
            } catch (error) {
                console.error(
                    'Failed to load related products',
                    error,
                );

                if (!cancelled) {
                    setRelatedProducts([]);
                }
            }
        }

        loadRelatedProducts();

        return () => {
            cancelled = true;
        };
    }, [lineItems]);

    if (!cart || lineItems.length === 0) {
        return (
            <div className="max-w-4xl mx-auto py-16 px-4 text-center">
                <h1 className="text-3xl font-bold mb-8">
                    Your Cart
                </h1>

                <div className="bg-white p-12 rounded-lg shadow-md border border-gray-100">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        className="w-24 h-24 mx-auto text-gray-300 mb-6"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                        />
                    </svg>

                    <p className="text-xl text-gray-600 mb-8">
                        Your cart is currently empty.
                    </p>

                    <Link
                        link="/"
                        className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors"
                    >
                        Start Shopping
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto py-4 lg:py-8 lg:px-4">
            <h1 className="text-3xl font-bold mb-8">
                Your Cart ({cartCount} items)
            </h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Cart Items */}
                <div className="lg:col-span-2">
                    {cartError && (
                        <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
                            {cartError}
                        </p>
                    )}
                    <div className="bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden">
                        <ul className="divide-y divide-gray-200">
                            {lineItems.map((item) => {
                                const itemName =
                                    item.name['en-US'] ??
                                    Object.values(item.name)[0] ??
                                    'Product';

                                const image =
                                    item.variant.images?.[0]?.url;

                                const productSlug =
                                    item.productSlug?.['en-US'] || item.id;

                                return (
                                    <li
                                        key={item.id}
                                        className="p-6 flex flex-col sm:flex-row gap-6"
                                    >
                                        {/* Image */}
                                        <div className="w-24 h-24 flex-shrink-0 bg-gray-100 rounded-md overflow-hidden">
                                            {image ? (
                                                <img
                                                    src={image}
                                                    alt={itemName}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                                                    No img
                                                </div>
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 flex flex-col justify-between">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <Link link={`/products/${productSlug}`}>
                                                        <h3 className="text-lg font-bold text-gray-900 leading-tight hover:underline">
                                                            {itemName}
                                                        </h3>
                                                    </Link>
                                                    <p className="text-sm text-gray-500 mt-1">
                                                        {item.variant.sku
                                                            ? `SKU: ${item.variant.sku}`
                                                            : `Product ID: ${item.productId}`}
                                                    </p>
                                                    {item.taxRate && (
                                                        <p className="text-xs text-blue-600 mt-1">
                                                            {translate('taxRateLabel')} ({item.taxRate.amount * 100}%)
                                                            {item.taxRate.includedInPrice && ` (${translate('taxIncludedLabel')})`}
                                                        </p>
                                                    )}
                                                </div>

                                                <p className="text-lg font-semibold text-blue-600">
                                                    <PriceDisplay money={item.totalPrice} locale={locale} />
                                                </p>
                                            </div>

                                            <div className="flex justify-between items-center mt-4">
                                                {/* Quantity */}
                                                <div className="flex items-center border border-gray-300 rounded-md">
                                                    <button
                                                        type="button"
                                                        disabled={updatingItemId === item.id}
                                                        onClick={() =>
                                                            handleQuantityChange(
                                                                item.id,
                                                                item.quantity -
                                                                1,
                                                            )
                                                        }
                                                        className="px-3 py-1 text-gray-600 hover:bg-gray-100 transition-colors"
                                                    >
                                                        -
                                                    </button>

                                                    <span className="px-4 py-1 text-sm font-medium border-x border-gray-300">
                                                        {item.quantity}
                                                    </span>

                                                    <button
                                                        type="button"
                                                        disabled={updatingItemId === item.id}
                                                        onClick={() =>
                                                            handleQuantityChange(
                                                                item.id,
                                                                item.quantity +
                                                                1,
                                                            )
                                                        }
                                                        className="px-3 py-1 text-gray-600 hover:bg-gray-100 transition-colors"
                                                    >
                                                        +
                                                    </button>
                                                </div>

                                                {/* Remove */}
                                                <button
                                                    type="button"
                                                    onClick={() => setItemToRemove(item.id)}
                                                    className="text-sm font-medium text-red-600 hover:text-red-500 transition-colors flex items-center gap-1 cursor-pointer hover:underline"
                                                >
                                                    <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        stroke="currentColor"
                                                        className="w-4 h-4"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2}
                                                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                        />
                                                    </svg>

                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                </div>

                {/* Order Summary */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-lg shadow-md border border-gray-100 p-6 sticky top-8">
                        <h2 className="text-xl font-bold mb-6 pb-6 border-b">
                            Order Summary
                        </h2>

                        {/* Coupon */}
                        <div className="mb-6">
                            <div className="flex gap-2">
                                <div className="float-field flex-1">
                                    <input
                                        id="coupon"
                                        type="text"
                                        value={couponCode}
                                        onChange={(e) => {
                                            setCouponCode(e.target.value);
                                            setCouponError('');
                                        }}
                                        placeholder=" "
                                        disabled={isApplyingCoupon}
                                    />
                                    <label htmlFor="coupon">{translate('couponCodeLabel')}</label>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleApplyCoupon}
                                    disabled={
                                        isApplyingCoupon ||
                                        Boolean(selectedCoupon && couponCode === appliedCouponCode) ||
                                        !couponCode.trim()
                                    }
                                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {isApplyingCoupon
                                        ? translate('couponApplying')
                                        : selectedCoupon && couponCode === appliedCouponCode
                                          ? translate('couponAppliedLabel')
                                        : translate('apply')}
                                </button>
                            </div>

                            {cart?.discountCodes.map(({ discountCode, state }) => (
                                <div
                                    key={discountCode.id}
                                    className="mt-3 flex items-center justify-between gap-3 rounded-md bg-gray-50 px-3 py-2 text-sm"
                                >
                                    <span>
                                        {discountCode.id === appliedCouponId && appliedCouponCode
                                            ? appliedCouponCode
                                            : translate('couponAppliedGeneric')}
                                        <span className="ml-2 text-xs text-gray-500">({state})</span>
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveCoupon(discountCode.id)}
                                        disabled={removingCouponId === discountCode.id}
                                        className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                                    >
                                        {removingCouponId === discountCode.id
                                            ? translate('couponRemoving')
                                            : translate('couponRemove')}
                                    </button>
                                </div>
                            ))}

                            {couponError && (
                                <p className="mt-2 text-sm text-red-600" role="alert">
                                    {couponError}
                                </p>
                            )}
                            {couponApplyStatus === 'waiting-for-shipping' && (
                                <p className="mt-2 text-sm text-green-700" role="status" aria-live="polite">
                                    {translate('couponWaitingForShipping')}
                                </p>
                            )}
                            {couponApplyStatus === 'applied' && (
                                <p className="mt-2 text-sm text-green-700" role="status" aria-live="polite">
                                    {translate('couponApplied', { code: appliedCouponCode })}
                                </p>
                            )}
                        </div>

                        <div className="space-y-4 mb-6">
                            <div className="flex justify-between text-gray-600">
                                <span>
                                    {taxBasis === 'included'
                                        ? translate('subtotalIncludingTax')
                                        : taxBasis === 'excluded'
                                          ? translate('subtotalExcludingTax')
                                          : translate('subtotal')}
                                </span>

                                <span>
                                    {subtotalMoney && (
                                        <PriceDisplay money={subtotalMoney} locale={locale} />
                                    )}
                                </span>
                            </div>

                            {discountMoney && discountMoney.centAmount > 0 && (
                                <div className="flex justify-between text-green-600">
                                    <span>{translate('discount')}</span>
                                    <span>-<PriceDisplay money={discountMoney} locale={locale} /></span>
                                </div>
                            )}

                            <div className="flex justify-between text-gray-600">
                                <span>
                                    {taxBasis === 'included'
                                        ? translate('includedTax')
                                        : taxBasis === 'excluded'
                                          ? translate('tax')
                                          : translate('taxDetails')}
                                </span>

                                <span>
                                    {taxMoney
                                        ? <PriceDisplay money={taxMoney} locale={locale} />
                                        : translate('taxNotCalculated')}
                                </span>
                            </div>

                            {shippingMoney && (
                                <div className="flex justify-between text-gray-600">
                                    <span>{translate('shipping')}</span>
                                    <span className="text-right">
                                        {shippingDiscountMoney && originalShippingMoney && (
                                            <span className="mr-2 text-gray-400 line-through">
                                                <PriceDisplay money={originalShippingMoney} locale={locale} />
                                            </span>
                                        )}
                                        <PriceDisplay money={shippingMoney} locale={locale} />
                                    </span>
                                </div>
                            )}
                            {shippingDiscountMoney && shippingDiscountMoney.centAmount > 0 && (
                                <div className="flex justify-between text-green-600">
                                    <span>{translate('shippingDiscount')}</span>
                                    <span>
                                        -<PriceDisplay money={shippingDiscountMoney} locale={locale} />
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="border-t pt-6 mb-8">
                            <div className="flex justify-between text-xl font-bold">
                                <span>Total</span>

                                <span className="text-blue-600">
                                    {cart && <PriceDisplay money={cart.totalPrice} locale={locale} />}
                                </span>
                            </div>
                        </div>

                        <Link
                            link="/checkout"
                            className="w-full bg-blue-600 text-white py-4 rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-md text-lg block text-center"
                        >
                            Checkout
                        </Link>

                        <div className="mt-4">
                            <RequestQuoteForm />
                        </div>

                        <div className="mt-6">
                            <Link
                                href="/"
                                className="block text-center text-sm text-gray-500 hover:text-blue-600 transition-colors"
                            >
                                Continue Shopping
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {relatedProducts.length > 0 && (
                <RelatedProducts products={relatedProducts} />
            )}


            <ConfirmDialog
                isOpen={itemToRemove !== null}
                title="Remove item?"
                message="Are you sure you want to remove this item from your cart?"
                onCancel={() => {
                    if (!isRemoving) {
                        setItemToRemove(null);
                    }
                }}
                onConfirm={handleConfirmRemove}
                loading={isRemoving}
            />
        </div>
    );
}
