'use client';

import { useState } from 'react';
import { useCart } from '../../../../context/CartContext';
import WishlistButton from "@/components/WishlistButton";
import { useTranslations } from 'use-intl';
import {MAX_COMPARE_PRODUCTS, useCompare} from "@/context/CompareContext";
import Modal from "@/components/commercetools-ui/organisms/modal";
import {ProductProjection} from "@commercetools/platform-sdk";

type AddToCartButtonProduct = {
    id: string;
    name: string;
    price: number;
    currency: string;
    image?: string;
    availableQuantity?: number;
};

type AddToCartButtonProps = {
    product: AddToCartButtonProduct;
    wishlistProduct: ProductProjection;
    variantId: number;
    compareProduct?: ProductProjection;
    // false when the product is outside the store customer's Product Selections
    isAvailableInStore?: boolean;
};

export default function AddToCartButton({
                                            product,
                                            wishlistProduct,
                                            variantId,
                                            compareProduct,
                                            isAvailableInStore = true,
                                        }: AddToCartButtonProps) {
    const [quantity, setQuantity] = useState(1);
    const { addToCart } = useCart();

    const {
        addToCompare,
        removeFromCompare,
        isInCompare,
        isCompareLimitReached,
    } = useCompare();

    const compareProductId =
        compareProduct?.id ?? product.id;

    const isCompared = isInCompare(compareProductId);

    const isOutOfStock = product.availableQuantity !== undefined && product.availableQuantity <= 0;
    const canAddToCart = !isOutOfStock && isAvailableInStore;
    const translate = useTranslations();

    const [isAdding, setIsAdding] = useState(false);

    const handleAddToCart = async () => {
        if (!canAddToCart || isAdding) return;

        setIsAdding(true);

        try {
            await addToCart(
                product.id,
                variantId,
                quantity
            );
        } catch (error) {
            console.error('Failed to add to cart:', error);
            alert(error instanceof Error ? error.message : 'Unable to add product to cart');
        } finally {
            setIsAdding(false);
        }
    };

    const [showComparePopup, setShowComparePopup] =
        useState(false);

    const handleCompare = () => {
        if (isCompared) {
            removeFromCompare(compareProductId);
            return;
        }

        if (isCompareLimitReached) {
            setShowComparePopup(true);
            return;
        }

        if (compareProduct) {
            addToCompare(compareProduct);
        }
    };

    return (
        <div className="flex flex-col gap-4">
            {!isAvailableInStore && (
                <p className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-800">
                    This product is not available in your store.
                </p>
            )}
            {canAddToCart && (
                <div className="flex items-center gap-4">
                    <label htmlFor="quantity" className="font-medium text-gray-700">
                        Quantity:
                    </label>
                    <input
                        type="number"
                        id="quantity"
                        min="1"
                        max={product.availableQuantity}
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            )}
            <div className="flex flex-col gap-4 justify-between items-center">
                <button
                    className={`w-full py-3 px-3 rounded-lg font-bold transition-colors shadow-md ${
                        !canAddToCart
                            ? 'bg-gray-400 cursor-not-allowed opacity-50'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                    onClick={handleAddToCart}
                    disabled={!canAddToCart || isAdding}
                >
                    {!isAvailableInStore ? 'Out of stock' :
                    isOutOfStock ? translate('product.outOfStock') :
                    translate('cart.cart-add')}
                </button>
                <div className="flex items-center justify-between gap-2 sm:flex-row sm:items-center sm:gap-4">
                    <WishlistButton product={wishlistProduct} />

                    <button
                        type="button"
                        className="hover:underline cursor-pointer text-center mx-auto block w-full py-3 px-4 rounded-lg font-bold transition-colors shadow-md bg-green-600 text-white hover:bg-green-700"
                        onClick={handleCompare}
                        aria-pressed={isCompared}
                    >
                        {isCompared
                            ? 'Remove from Compare'
                            : 'Add to Compare'}
                    </button>
                </div>
            </div>

            {showComparePopup && (
                <Modal
                    isOpen={showComparePopup} onRequestClose={() => setShowComparePopup(false)}
                    className="w-full max-w-150! rounded-lg bg-white px-6 py-12 shadow-xl outline-none"
                >
                    <div
                        className="px-6 py-12"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center gap-4 justify-center">
                            <h2 className="text-xl font-semibold text-red-600 text-center">
                                You can compare up to {MAX_COMPARE_PRODUCTS} products!
                            </h2>
                        </div>

                        {/* Buttons */}
                        <div className="mt-6 flex justify-center gap-3">
                            <button
                                type="button"
                                onClick={() =>
                                    setShowComparePopup(false)
                                }
                                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

        </div>
    );
}
