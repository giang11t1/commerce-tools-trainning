'use client';

import { useState } from 'react';
import { useCart } from '../context/CartContext';
import { ProductProjection } from '@commercetools/platform-sdk';
import { useTranslations } from 'use-intl';

interface AddToCartButtonProps {
    product: ProductProjection;
    className?: string;
    variant?: 'primary' | 'outline' | 'small';
    availableQuantity: number;
}

export default function AddToCartButton({ product, className = '', variant = 'primary', availableQuantity }: AddToCartButtonProps) {
    const { addToCart } = useCart();
    const translate = useTranslations();
    const [isAdding, setIsAdding] = useState(false);

    const isOutOfStock = availableQuantity <= 0;

    const handleAddToCart = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (isOutOfStock || isAdding) return;

        const price = product.masterVariant.price;

        if (!price) {
            alert('Price not available for this product');
            return;
        }

        setIsAdding(true);

        try {
            await addToCart(
                product.id,
                product.masterVariant.id,
                1,
            );
        } catch (error) {
            console.error('Failed to add to cart:', error);
            alert(error instanceof Error ? error.message : 'Unable to add product to cart');
        } finally {
            setIsAdding(false);
        }
    };

    const baseStyles = 'inline-flex items-center justify-center font-bold rounded-lg transition-all duration-200';

    const variants = {
        primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm py-2 px-4 w-full',
        outline: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50 py-2 px-4 w-full',
        small: 'bg-blue-600 text-white hover:bg-blue-700 py-1.5 px-3 text-sm'
    };

    const stateStyles = isOutOfStock
        ? 'opacity-50 cursor-not-allowed bg-gray-400 hover:bg-gray-400'
        : isAdding
            ? 'opacity-75 cursor-wait'
            : 'cursor-pointer';

    return (
        <button
            type="button"
            onClick={handleAddToCart}
            disabled={isOutOfStock || isAdding}
            aria-busy={isAdding}
            className={`${baseStyles} ${variants[variant]} ${className} ${stateStyles}`}
        >
            {!isOutOfStock && isAdding && (
                <svg
                    className="h-5 w-5 mr-2 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
            )}
            {!isOutOfStock && !isAdding && (
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                </svg>
            )}
            {isOutOfStock ? translate('product.outOfStock') :
                translate('cart.cart-add')}
        </button>
    );
}
