'use client';

import React, {useRef, useEffect, useState} from 'react';
import Link from '@/components/commercetools-ui/atoms/link';
import {useCart} from '../context/CartContext';
import ConfirmDialog from '@/components/ConfirmDialog';
import PriceDisplay from '@/components/PriceDisplay';
import { getSubtotalMoney, getTaxBasis } from '@/lib/checkout-utils';
import { useLocale, useTranslations } from 'use-intl';

interface MinicartProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function Minicart({
                                     isOpen,
                                     onClose,
                                 }: MinicartProps) {
    const minicartRef = useRef<HTMLDivElement>(null);
    const [itemToRemove, setItemToRemove] = useState<string | null>(null);
    const [isRemoving, setIsRemoving] = useState(false);
    const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
    const [cartError, setCartError] = useState<string | null>(null);

    const {
        cart,
        removeFromCart,
        cartCount,
        updateCartQuantity,
    } = useCart();
    const locale = useLocale();
    const translate = useTranslations('checkout');


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

    // IMPORTANT:
    // Hooks must always run, even when isOpen === false.
    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const handleClickOutside = (event: MouseEvent) => {
            if (
                minicartRef.current &&
                !minicartRef.current.contains(
                    event.target as Node,
                )
            ) {
                onClose();
            }
        };

        document.addEventListener(
            'mousedown',
            handleClickOutside,
        );

        return () => {
            document.removeEventListener(
                'mousedown',
                handleClickOutside,
            );
        };
    }, [isOpen, onClose]);

    if (!isOpen) {
        return null;
    }

    const lineItems = cart?.lineItems ?? [];
    const subtotal = getSubtotalMoney(lineItems);
    const taxBasis = cart ? getTaxBasis(cart) : 'unknown';
    const subtotalLabel =
        taxBasis === 'included'
            ? translate('subtotalIncludingTax')
            : taxBasis === 'excluded'
              ? translate('subtotalExcludingTax')
              : translate('subtotal');

    return (
        <div
            ref={minicartRef}
            className=" h-screen overflow-hidden flex flex-col"
        >
            {/* Header */}
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center shrink-0">
                <h3 className="font-bold text-gray-900">
                    Shopping Cart ({cartCount})
                </h3>

                <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600"
                    aria-label="Close cart"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                    >
                        <path
                            fillRule="evenodd"
                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                            clipRule="evenodd"
                        />
                    </svg>
                </button>
            </div>

            <div className="flex flex-col h-full">
                {/* Items */}
                <div className="flex-1 overflow-y-auto">
                    {cartError && (
                        <p className="m-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
                            {cartError}
                        </p>
                    )}
                    {lineItems.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            Your cart is empty
                        </div>
                    ) : (
                        <ul className="divide-y divide-gray-100">
                            {lineItems.map((item) => {
                                const itemName =
                                    item.name['en-US'] ??
                                    Object.values(item.name)[0] ??
                                    'Product';

                                const image =
                                    item.variant.images?.[0]?.url;

                                return (
                                    <li
                                        key={item.id}
                                        className="p-4 flex gap-4"
                                    >
                                        {/* Image */}
                                        <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border border-gray-200 bg-gray-50">
                                            {image ? (
                                                <img
                                                    src={image}
                                                    alt={itemName}
                                                    className="h-full w-full object-cover object-center"
                                                />
                                            ) : (
                                                <div className="h-full w-full flex items-center justify-center text-[10px] text-gray-400">
                                                    No img
                                                </div>
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="flex flex-1 flex-col">
                                            <div className="flex justify-between text-sm font-medium text-gray-900">
                                                <h4 className="line-clamp-2">
                                                    {itemName}
                                                </h4>

                                                <p className="ml-4 whitespace-nowrap">
                                                    <PriceDisplay money={item.totalPrice} locale={locale} />
                                                </p>
                                            </div>

                                            <div className="mt-2 flex items-center justify-between text-xs">
                                                {/* Quantity */}
                                                <div className="flex items-center border rounded">
                                                    <button
                                                        type="button"
                                                        className="px-2 py-1 hover:bg-gray-100"
                                                        disabled={updatingItemId === item.id}
                                                        onClick={() =>
                                                            handleQuantityChange(
                                                                item.id,
                                                                item.quantity -
                                                                1,
                                                            )
                                                        }
                                                    >
                                                        −
                                                    </button>

                                                    <span className="px-2">
                                                        {item.quantity}
                                                    </span>

                                                    <button
                                                        type="button"
                                                        className="px-2 py-1 hover:bg-gray-100"
                                                        disabled={updatingItemId === item.id}
                                                        onClick={() =>
                                                            handleQuantityChange(
                                                                item.id,
                                                                item.quantity +
                                                                1,
                                                            )
                                                        }
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
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                {/* Footer */}
                {lineItems.length > 0 && (
                    <div className="p-4 border-t bg-gray-50">
                        <div className="flex justify-between text-base font-medium text-gray-900 mb-4">
                            <p>{subtotalLabel}</p>
                            <p>
                                {subtotal && <PriceDisplay money={subtotal} locale={locale} />}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <Link
                                link="/cart"
                                onClick={onClose}
                                className="flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                            >
                                View Cart
                            </Link>

                            <Link
                                link="/checkout"
                                onClick={onClose}
                                className="flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
                            >
                                Checkout
                            </Link>
                        </div>
                    </div>
                )}
            </div>


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
