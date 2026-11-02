'use client';

import {useEffect, useState} from 'react';
import {
    Price,
    ProductProjection,
    ProductVariant,
} from '@commercetools/platform-sdk';
import { useWishlist } from '@/context/WishlistContext';
import AddToCartButton from '@/components/AddToCartButton';
import { useLocale } from 'use-intl';
import { getLocalizationInfo } from '@/../project.config';
import { useTranslations } from 'use-intl';
import { usePathname } from 'next/navigation';
import Modal from '@/components/commercetools-ui/organisms/modal';
import AddToWishlistPopup from "@/components/AddToWishlistPopup";
import CreateWishlistPopup from "@/components/CreateWishlistPopup";
import {MAX_COMPARE_PRODUCTS, useCompare} from "@/context/CompareContext";
import Link from '@/components/commercetools-ui/atoms/link';
import type { ProductRating as ProductRatingType } from '@/lib/reviews';
import ProductRating from "@/components/ProductRating";
import PriceDisplay from '@/components/PriceDisplay';
import { hasDiscountedPrice } from '@/lib/checkout-utils';

interface ProductCardProps {
    product: ProductProjection;
    activeWishlistName?: string;
    activeWishlistId?: string;
    viewMode?: 'grid' | 'list';
    rating?: ProductRatingType;
    availableQuantity?: number;
    /** Stock keyed by variant SKU; falls back to availableQuantity when missing */
    variantQuantities?: Record<string, number>;
    storeAvailable?: boolean;
}

export default function ProductCard({
                                        product, activeWishlistName, activeWishlistId, viewMode = 'grid', rating, availableQuantity = 0, variantQuantities, storeAvailable
                                    }: ProductCardProps) {
    const {
        wishlists,
        createWishlist,
        removeProductFromWishlist,
        isProductInAnyWishlist,
    } = useWishlist();

    const {
        addToCompare,
        removeFromCompare,
        isInCompare,
        isCompareLimitReached,
    } = useCompare();

    const [showWishlistPopup, setShowWishlistPopup] =
        useState(false);

    const [showCreateWishlist, setShowCreateWishlist] =
        useState(false);

    const [wishlistName, setWishlistName] =
        useState('');

    const [creatingWishlist, setCreatingWishlist] =
        useState(false);

    const [addingToWishlist, setAddingToWishlist] =
        useState(false);

    const [showRemoveConfirm, setShowRemoveConfirm] =
        useState(false);

    const [removingFromWishlist, setRemovingFromWishlist] =
        useState(false);

    const isWishlisted =
        isProductInAnyWishlist(product.id);

    const locale = useLocale();
    const translate = useTranslations();
    const ctLocale =
        getLocalizationInfo(locale).locale;

    const pathname = usePathname();
    const isWishlistPage = pathname.split('/').includes('wishlist');
    const canMoveFromActiveWishlist = Boolean(
        isWishlistPage &&
        activeWishlistId &&
        wishlists.some((wishlist) => wishlist.id !== activeWishlistId)
    );

    const compared = isInCompare(product.id);

    const [showComparePopup, setShowComparePopup] =
        useState(false);

    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [checkingSession, setCheckingSession] = useState(true);

    const isList = viewMode === 'list';


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

    const handleCompare = () => {
        if (compared) {
            removeFromCompare(product.id);
            return;
        }

        const added = addToCompare(product);

        if (!added && isCompareLimitReached) {
            setShowComparePopup(true);
            console.log(
                `You can compare up to ${MAX_COMPARE_PRODUCTS} products`
            );
        }
    };

    const allVariants: ProductVariant[] = [
        ...(product.masterVariant
            ? [product.masterVariant]
            : []),
        ...(Array.isArray(product.variants)
            ? product.variants
            : []),
    ];

    const defaultVariant =
        product.masterVariant ??
        (Array.isArray(product.variants)
            ? product.variants[0]
            : undefined);

    const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>(defaultVariant);

    const image =
        selectedVariant?.images?.[0] ??
        product.masterVariant.images?.[0];

    const price = selectedVariant?.price;

    const discountedPrice =
        price && hasDiscountedPrice(price.value, price.discounted?.value)
            ? price.discounted
            : undefined;

    const getSalePercent = (price: Price) => {
        if (!hasDiscountedPrice(price.value, price.discounted?.value)) {
            return 0;
        }

        const original =
            price.value.centAmount;

        const discounted =
            price.discounted.value.centAmount;

        if (!original) {
            return 0;
        }

        return Math.round(
            ((original - discounted) /
                original) *
            100
        );
    };

    const salePercent = price
        ? getSalePercent(price)
        : 0;

    const productName =
        typeof product.name === 'object'
            ? product.name[ctLocale] ??
            product.name['en-US']
            : product.name;

    const productSlug =
        product.slug?.[ctLocale as keyof typeof product.slug] ||
        product.id;

    const [wishlistNameError, setWishlistNameError] =
        useState('');
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

    const handleRemoveFromWishlist = (
        e: React.MouseEvent<HTMLButtonElement>
    ) => {
        e.preventDefault();
        e.stopPropagation();

        if (addingToWishlist || removingFromWishlist) {
            return;
        }

        setShowRemoveConfirm(true);
    };

    const confirmRemoveFromWishlist = async () => {
        if (removingFromWishlist) {
            return;
        }

        try {
            setRemovingFromWishlist(true);

            // Find every wishlist containing this product
            const productWishlists = wishlists.filter(
                (wishlist) =>
                    wishlist.products?.some(
                        (item) =>
                            item.id === product.id
                    )
            );

            // Remove from all wishlists
            await Promise.all(
                productWishlists.map((wishlist) =>
                    removeProductFromWishlist(
                        wishlist.id,
                        product.id
                    )
                )
            );

            setShowRemoveConfirm(false);
        } catch (error) {
            console.error(
                'Failed to remove product from wishlist:',
                error
            );
        } finally {
            setRemovingFromWishlist(false);
        }
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

    const variantForCart =
        selectedVariant ?? product.masterVariant;

    const variantAvailableQuantity =
        (variantForCart?.sku
            ? variantQuantities?.[variantForCart.sku]
            : undefined) ?? availableQuantity;

    return (
        <div
            key={product.id}
            className={`relative group border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-all bg-white flex
             ${isList ? 'flex-row ' : ' flex-col'} ` }
        >
            {/* Product */}
            <Link
                link={`/products/${productSlug}`}
                className={`block flex-grow shrink-0 ${isList ? 'w-[280px]' : 'w-full'}`}
            >
                <div className="aspect-square w-full overflow-hidden rounded-md bg-gray-100 mb-4 relative">
                    {image?.url && (
                        <img
                            src={image.url}
                            alt={
                                image.label ||
                                productName
                            }
                            className="object-contain aspect-square transition-transform duration-300 group-hover:scale-105"
                        />
                    )}

                    {salePercent > 0 && (
                        <span className="sale-badge absolute bottom-2 left-2 bg-red-500 text-xs text-white px-2 py-1 rounded font-semibold">
                            -{salePercent}%
                        </span>
                    )}
                </div>
            </Link>
            <div className={`flex flex-col  w-full ${isList ? 'px-6' : ''}`}>
                <Link
                    link={`/products/${productSlug}`}
                >
                    <h2 className="text-lg font-semibold mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
                        {productName}
                    </h2>
                </Link>
                <div className="flex items-baseline gap-2 mb-4">
                    {discountedPrice && price ? (
                        <>
                            <p className="text-lg font-bold text-red-600">
                                <PriceDisplay money={discountedPrice.value} locale={ctLocale} />
                            </p>
                            <p className="text-sm text-gray-500 line-through">
                                <PriceDisplay money={price.value} locale={ctLocale} />
                            </p>
                        </>
                    ) : price ? (
                        <p className="text-lg font-bold text-blue-600">
                            <PriceDisplay money={price.value} locale={ctLocale} />
                        </p>
                    ) : (
                        <p className="text-lg font-bold text-gray-400">
                            —
                        </p>
                    )}
                </div>

               <div className="mb-4">
                   <ProductRating
                       rating={rating?.averageRating ?? 0}
                       reviewCount={rating?.reviewCount ?? 0}
                   />
               </div>

                {/* Variants */}
                <div className="flex flex-wrap gap-2 mb-4">
                    {allVariants
                        .slice(0, 4)
                        .map(
                            (
                                variant: ProductVariant
                            ) => {
                                const colorCode =
                                    variant.attributes?.find(
                                        (attribute) =>
                                            attribute.name ===
                                            'color-code'
                                    )?.value;

                                if (!colorCode) {
                                    return null;
                                }

                                return (
                                    <button
                                        key={
                                            variant.id
                                        }
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();

                                            setSelectedVariant(
                                                variant
                                            );
                                        }}
                                        className={`h-4 w-4 rounded-full border shadow-sm transition-transform hover:scale-110 ${
                                            selectedVariant?.id ===
                                            variant.id
                                                ? 'border-blue-600 ring-1 ring-blue-600'
                                                : 'border-gray-300'
                                        }`}
                                        style={{
                                            backgroundColor:
                                            colorCode,
                                        }}
                                        title={
                                            variant.sku
                                        }
                                    />
                                );
                            }
                        )}

                    {allVariants.length > 4 && (
                        <span className="text-[10px] px-2 py-0.5 text-gray-400">
                        +
                            {allVariants.length -
                                4}{' '}
                            more
                    </span>
                    )}
                </div>
            </div>

           <div className={`flex flex-col items-center justify-center gap-2 ${isList ? 'w-[310px]' : 'w-full'}`}>
               {/* Add to cart */}
               {variantForCart && storeAvailable === false ? (
                   <button
                       type="button"
                       disabled
                       className="inline-flex w-full cursor-not-allowed items-center justify-center rounded-lg bg-gray-400 px-4 py-2 font-bold text-white opacity-60"
                   >
                       {translate('product.notAvailableInStore')}
                   </button>
               ) : variantForCart && (
                   <AddToCartButton
                       product={{
                           ...product,
                           masterVariant: variantForCart,
                       }}
                       availableQuantity={variantAvailableQuantity}
                       variant="primary"
                   />
               )}

               {canMoveFromActiveWishlist && (
                   <button
                       type="button"
                       onClick={handleWishlistClick}
                       disabled={addingToWishlist || removingFromWishlist}
                       className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                   >
                       {translate.has('wishlist.move-item-button')
                           ? translate('wishlist.move-item-button')
                           : locale === 'de'
                               ? 'In eine andere Wunschliste verschieben'
                               : 'Move to another wishlist'}
                   </button>
               )}

               {/* Wishlist button */}
               <button
                   type="button"
                   onClick={
                       (isWishlisted && isWishlistPage)
                           ? handleRemoveFromWishlist
                           : handleWishlistClick
                   }
                   disabled={
                       addingToWishlist ||
                       removingFromWishlist
                   }
                   className="absolute top-3 right-3 text-red-500 transition-colors z-10 hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                   aria-label={
                       isWishlisted
                           ? 'Remove from wishlist'
                           : 'Add to wishlist'
                   }
               >
                   {(isWishlisted && isWishlistPage) ? (
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
                               strokeWidth={2}
                               d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3m-4 0h14"
                           />
                       </svg>
                   ) : (
                       <svg
                           xmlns="http://www.w3.org/2000/svg"
                           className="h-6 w-6"
                           fill={
                               isWishlisted
                                   ? 'currentColor'
                                   : 'none'
                           }
                           viewBox="0 0 24 24"
                           stroke="currentColor"
                       >
                           <path
                               strokeLinecap="round"
                               strokeLinejoin="round"
                               strokeWidth={2}
                               d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364l-1.318 1.318-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                           />
                       </svg>
                   )}

               </button>

               <button
                   type="button"
                   className="hover:underline cursor-pointer text-center mt-2 mx-auto block"
                   onClick={handleCompare}
                   aria-pressed={compared}
               >
                   {compared
                       ? 'Remove from Compare'
                       : 'Add to Compare'}
               </button>
           </div>



            {/* =====================================================
                ADD TO WISHLIST POPUP
            ====================================================== */}
            {showWishlistPopup && (
                <AddToWishlistPopup
                    product={product}
                    setShowWishlistPopup={setShowWishlistPopup}
                    setShowCreateWishlist={setShowCreateWishlist}
                    moveFromWishlistId={canMoveFromActiveWishlist ? activeWishlistId : undefined}
                />
            )}

            {/* =====================================================
                CREATE WISHLIST MODAL
            ====================================================== */}
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
                                disabled={removingFromWishlist}
                                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* =====================================================
            REMOVE FROM WISHLIST CONFIRMATION MODAL
        ====================================================== */}

            <Modal isOpen={showRemoveConfirm} onRequestClose={() => setShowRemoveConfirm(false)} >
                <div
                    className="p-6"
                    onClick={() => {
                        if (!removingFromWishlist) {
                            setShowRemoveConfirm(false);
                        }
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-start gap-4">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-5 w-5 text-red-600"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 9v2m0 4h.01M12 3a9 9 0 100 18 9 9 0 000-18z"
                                    />
                                </svg>
                            </div>

                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">
                                    Remove from wishlist?
                                </h2>

                                <p className="mt-1 text-sm ">
                                    Are you sure you want to remove{' '}
                                    <span className="font-medium ">
                                        {productName}
                                    </span>{' '}
                                    from <b>{activeWishlistName}</b>?
                                </p>
                            </div>
                        </div>

                        {/* Buttons */}
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() =>
                                    setShowRemoveConfirm(false)
                                }
                                disabled={removingFromWishlist}
                                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={confirmRemoveFromWishlist}
                                disabled={removingFromWishlist}
                                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {removingFromWishlist
                                    ? 'Removing...'
                                    : 'Remove'}
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
