'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import ProductCard from '@/components/ProductCard';
import {useWishlist, Wishlist} from '@/context/WishlistContext';
import AccountSidebar from '@/components/AccountSidebar';
import Pagination from "@/components/Pagination";
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
import CreateWishlistPopup from '@/components/CreateWishlistPopup';
import AddToWishlistPopup from '@/components/AddToWishlistPopup';
import { useLocale, useTranslations } from 'use-intl';

export default function WishlistPage() {
    const { wishlists, loaded, createWishlist, deleteWishlist, renameWishlist } = useWishlist();
    const translate = useTranslations('wishlist');
    const locale = useLocale();
    const addNewWishlistLabel = translate.has('add-new-wishlist')
        ? translate('add-new-wishlist')
        : locale === 'de'
            ? 'Neue Wunschliste hinzufügen'
            : 'Add new wishlist';
    const searchParams = useSearchParams();

    const [activeWishlistId, setActiveWishlistId] =
        useState<string | null>(null);

    const [deletingWishlistId, setDeletingWishlistId] =
        useState<string | null>(null);

    const [editingWishlistId, setEditingWishlistId] =
        useState<string | null>(null);

    const [editingWishlistName, setEditingWishlistName] =
        useState('');

    const [renamingWishlistId, setRenamingWishlistId] =
        useState<string | null>(null);

    const [showCreateWishlist, setShowCreateWishlist] = useState(false);
    const [showAddToWishlistPopup, setShowAddToWishlistPopup] = useState(false);
    const [wishlistName, setWishlistName] = useState('');
    const [wishlistNameError, setWishlistNameError] = useState('');
    const [creatingWishlist, setCreatingWishlist] = useState(false);

    const limit = 5;

    // Select first wishlist automatically
    useEffect(() => {
        if (
            !activeWishlistId &&
            wishlists.length > 0
        ) {
            setActiveWishlistId(wishlists[0].id);
        }
    }, [wishlists, activeWishlistId]);


    const activeWishlist = wishlists.find(
        (wishlist) =>
            wishlist.id === activeWishlistId
    );

    const [wishlistInventory, setWishlistInventory] = useState<{
        wishlistId: string | null;
        status: 'idle' | 'loading' | 'loaded' | 'error';
        quantities: Record<string, number>;
        storeAvailability: Record<string, boolean>;
    }>({ wishlistId: null, status: 'idle', quantities: {}, storeAvailability: {} });

    useEffect(() => {
        if (!activeWishlist) return;

        const wishlistId = activeWishlist.id;
        const skus = activeWishlist.products
            .flatMap((product) => [product.masterVariant, ...(product.variants ?? [])])
            .map((variant) => variant?.sku)
            .filter((sku): sku is string => Boolean(sku));

        let cancelled = false;
        setWishlistInventory({ wishlistId, status: 'loading', quantities: {}, storeAvailability: {} });

        const productIds = activeWishlist.products.map((product) => product.id);
        Promise.all([
            fetch('/api/inventory/batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ skus }),
            }),
            fetch('/api/products/store-availability', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productIds }),
            }),
        ])
            .then(async ([inventoryResponse, availabilityResponse]) => {
                if (!inventoryResponse.ok || !availabilityResponse.ok) {
                    throw new Error('Failed to load wishlist product availability');
                }
                const [inventoryData, availabilityData] = await Promise.all([
                    inventoryResponse.json(),
                    availabilityResponse.json(),
                ]);
                if (!cancelled) {
                    setWishlistInventory({
                        wishlistId,
                        status: 'loaded',
                        quantities: inventoryData.inventory ?? {},
                        storeAvailability: availabilityData.availability ?? {},
                    });
                }
            })
            .catch((error) => {
                console.error('Failed to load wishlist product inventory:', error);
                if (!cancelled) {
                    setWishlistInventory({
                        wishlistId,
                        status: 'error',
                        quantities: {},
                        storeAvailability: {},
                    });
                }
            });

        return () => {
            cancelled = true;
        };
    }, [activeWishlist?.id, activeWishlist?.products]);

    const wishlistProducts =
        activeWishlist?.products ?? [];

    const hasWishlistInventory =
        wishlistInventory.wishlistId === activeWishlist?.id;

    const total = wishlistProducts.length;
    const requestedPage = Number(searchParams.get('page'));
    const pageFromUrl = Number.isInteger(requestedPage) && requestedPage > 0
        ? requestedPage
        : 1;
    const currentPage = Math.min(
        pageFromUrl,
        Math.max(1, Math.ceil(total / limit))
    );

    const startIndex =
        (currentPage - 1) * limit;

    const paginatedProducts =
        wishlistProducts.slice(
            startIndex,
            startIndex + limit
        );

    const handleCreateWishlist = async (e: React.FormEvent) => {
        e.preventDefault();

        const name = wishlistName.trim();
        if (!name) return;

        const duplicate = wishlists.some(
            (wishlist) => wishlist.name.trim().toLowerCase() === name.toLowerCase()
        );
        if (duplicate) {
            setWishlistNameError(translate('wishlist-name-duplicate'));
            return;
        }

        try {
            setCreatingWishlist(true);
            setWishlistNameError('');
            const newWishlist = await createWishlist(name);
            setWishlistName('');
            setShowCreateWishlist(false);
            setShowAddToWishlistPopup(false);
            setActiveWishlistId(newWishlist.id);
        } catch (error) {
            setWishlistNameError(
                error instanceof Error
                    ? error.message
                    : translate('wishlist-create-error')
            );
        } finally {
            setCreatingWishlist(false);
        }
    };

    const [wishlistToDelete, setWishlistToDelete] = useState<string | null>(null);

    const handleDeleteWishlist = (e: React.MouseEvent<HTMLButtonElement>, wishlistId: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (deletingWishlistId) {
            return;
        }
        setWishlistToDelete(wishlistId);
    };

    const handleConfirmDeleteWishlist = async () => {
        if (!wishlistToDelete || deletingWishlistId) {
            return;
        }
        const wishlistId = wishlistToDelete;
        try {
            setDeletingWishlistId(wishlistId);
            await deleteWishlist(wishlistId);
            if (activeWishlistId === wishlistId) {
                const remainingWishlist = wishlists.find((wishlist) => wishlist.id !== wishlistId);
                setActiveWishlistId(remainingWishlist?.id ?? null);
            }
            setWishlistToDelete(null);
        } catch (error) {
            console.error('Failed to delete wishlist:', error);
        } finally {
            setDeletingWishlistId(null);
        }
    };

    const handleStartRename = (
        e: React.MouseEvent<HTMLButtonElement>,
        wishlist: Wishlist
    ) => {
        e.preventDefault();
        e.stopPropagation();

        setEditingWishlistId(wishlist.id);
        setEditingWishlistName(wishlist.name);
    };

    const handleCancelRename = () => {
        setEditingWishlistId(null);
        setEditingWishlistName('');
    };

    const handleRenameWishlist = async (
        e: React.FormEvent,
        wishlistId: string
    ) => {
        e.preventDefault();
        e.stopPropagation();

        const name = editingWishlistName.trim();

        if (!name) {
            return;
        }

        // Prevent duplicate names
        const duplicate = wishlists.some(
            (wishlist) =>
                wishlist.id !== wishlistId &&
                wishlist.name.trim().toLowerCase() ===
                name.toLowerCase()
        );

        if (duplicate) {
            alert(
                'A wishlist with this name already exists.'
            );
            return;
        }

        try {
            setRenamingWishlistId(wishlistId);

            await renameWishlist(
                wishlistId,
                name
            );

            setEditingWishlistId(null);
            setEditingWishlistName('');
        } catch (error) {
            console.error(
                'Failed to rename wishlist:',
                error
            );
        } finally {
            setRenamingWishlistId(null);
        }
    };

    if (!loaded) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-1">
                        <AccountSidebar />
                    </div>

                    <div className="md:col-span-2">
                        <div className="animate-pulse">
                            <div className="h-8 bg-gray-200 rounded w-48 mb-6" />

                            <div className="space-y-3">
                                <div className="h-12 bg-gray-200 rounded" />
                                <div className="h-12 bg-gray-200 rounded" />
                                <div className="h-12 bg-gray-200 rounded" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">
                    {translate('my-wishlist')}
                </h1>

                <div className="flex items-center gap-4">
                    <button
                        type="button"
                        onClick={() => {
                            setWishlistNameError('');
                            setShowAddToWishlistPopup(true);
                        }}
                        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                        {addNewWishlistLabel}
                    </button>
                    <Link
                        href="/account"
                        className="text-sm font-medium text-blue-600 hover:text-blue-500"
                    >
                        Back to Account
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Account sidebar */}
                <div className="md:col-span-1">
                    <AccountSidebar />
                </div>

                {/* Wishlist content */}
                <div className="md:col-span-2">
                    {wishlists.length === 0 ? (
                        <EmptyWishlist />
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                            {/* Wishlist names */}
                            <div className="lg:col-span-1">
                                <h2 className="text-lg font-semibold mb-4">
                                    My Lists
                                </h2>

                                <div className="space-y-2">
                                    {wishlists.map((wishlist) => {
                                        const isEditing =
                                            editingWishlistId === wishlist.id;

                                        const isRenaming =
                                            renamingWishlistId === wishlist.id;

                                        const isDeleting =
                                            deletingWishlistId === wishlist.id;

                                        return (
                                            <div
                                                key={wishlist.id}
                                                className={`
                                                        w-full
                                                        flex
                                                        items-center
                                                        rounded-lg
                                                        border
                                                        transition-colors
                                                        ${
                                                    activeWishlistId === wishlist.id
                                                        ? 'border-blue-600 bg-blue-50'
                                                        : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50'
                                                    }
                                                `}
                                            >
                                                {isEditing ? (
                                                    /* =========================
                                                       EDIT MODE
                                                    ========================== */
                                                    <form
                                                        onSubmit={(e) =>
                                                            handleRenameWishlist(
                                                                e,
                                                                wishlist.id
                                                            )
                                                        }
                                                        className="flex w-full items-center gap-2 px-3 py-2"
                                                    >
                                                        <input
                                                            type="text"
                                                            value={editingWishlistName}
                                                            onChange={(e) =>
                                                                setEditingWishlistName(
                                                                    e.target.value
                                                                )
                                                            }
                                                            autoFocus
                                                            disabled={isRenaming}
                                                            className="
                                                                min-w-0
                                                                flex-1
                                                                rounded-md
                                                                border
                                                                border-gray-300
                                                                bg-white
                                                                px-3
                                                                py-2
                                                                text-sm
                                                                text-gray-700
                                                                outline-none
                                                                focus:border-blue-500
                                                                focus:ring-1
                                                                focus:ring-blue-500
                                                            "
                                                        />

                                                        {/* Save */}
                                                        <button
                                                            type="submit"
                                                            disabled={
                                                                isRenaming ||
                                                                !editingWishlistName.trim()
                                                            }
                                                            className="
                                                                    flex
                                                                    h-8
                                                                    w-8
                                                                    shrink-0
                                                                    items-center
                                                                    justify-center
                                                                    rounded-md
                                                                    text-green-600
                                                                    hover:bg-green-50
                                                                    disabled:cursor-not-allowed
                                                                    disabled:opacity-50
                                                                "
                                                            aria-label="Save wishlist name"
                                                        >
                                                            {isRenaming ? (
                                                                <svg
                                                                    className="h-4 w-4 animate-spin"
                                                                    viewBox="0 0 24 24"
                                                                    fill="none"
                                                                >
                                                                    <circle
                                                                        className="opacity-25"
                                                                        cx="12"
                                                                        cy="12"
                                                                        r="10"
                                                                        stroke="currentColor"
                                                                        strokeWidth="4"
                                                                    />
                                                                    <path
                                                                        className="opacity-75"
                                                                        fill="currentColor"
                                                                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                                                                    />
                                                                </svg>
                                                            ) : (
                                                                <svg
                                                                    xmlns="http://www.w3.org/2000/svg"
                                                                    className="h-4 w-4"
                                                                    fill="none"
                                                                    viewBox="0 0 24 24"
                                                                    stroke="currentColor"
                                                                >
                                                                    <path
                                                                        strokeLinecap="round"
                                                                        strokeLinejoin="round"
                                                                        strokeWidth={2}
                                                                        d="M5 13l4 4L19 7"
                                                                    />
                                                                </svg>
                                                            )}
                                                        </button>

                                                        {/* Cancel */}
                                                        <button
                                                            type="button"
                                                            disabled={isRenaming}
                                                            onClick={
                                                                handleCancelRename
                                                            }
                                                            className="
                                                                    flex
                                                                    h-8
                                                                    w-8
                                                                    shrink-0
                                                                    items-center
                                                                    justify-center
                                                                    rounded-md
                                                                    text-gray-400
                                                                    hover:bg-gray-100
                                                                    hover:text-gray-600
                                                                "
                                                            aria-label="Cancel rename"
                                                        >
                                                            <svg
                                                                xmlns="http://www.w3.org/2000/svg"
                                                                className="h-4 w-4"
                                                                fill="none"
                                                                viewBox="0 0 24 24"
                                                                stroke="currentColor"
                                                            >
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    strokeWidth={2}
                                                                    d="M6 18L18 6M6 6l12 12"
                                                                />
                                                            </svg>
                                                        </button>
                                                    </form>
                                                ) : (
                                                    <>
                                                        {/* Select wishlist */}
                                                        <button
                                                            type="button"
                                                            disabled={
                                                                isDeleting ||
                                                                isRenaming
                                                            }
                                                            onClick={() =>
                                                                setActiveWishlistId(
                                                                    wishlist.id
                                                                )
                                                            }
                                                            className="flex min-w-0 flex-1 items-center justify-between px-4 py-3 text-left"
                                                        >
                                                            <span
                                                                className={`
                                                                    truncate font-medium
                                                                    ${
                                                                    activeWishlistId ===
                                                                    wishlist.id
                                                                        ? 'text-blue-600'
                                                                        : 'text-gray-700'
                                                                }
                                                                `}
                                                            >
                                                                {wishlist.name}
                                                            </span>

                                                            <span className="ml-2 shrink-0 text-sm text-gray-400">
                                                                {wishlist.products?.length ??
                                                                    0}
                                                            </span>
                                                        </button>

                                                        {/* Rename */}
                                                        <button
                                                            type="button"
                                                            disabled={isDeleting}
                                                            onClick={(e) =>
                                                                handleStartRename(
                                                                    e,
                                                                    wishlist
                                                                )
                                                            }
                                                            className="
                                                                    flex
                                                                    h-8
                                                                    w-8
                                                                    shrink-0
                                                                    items-center
                                                                    justify-center
                                                                    rounded-md
                                                                    text-gray-400
                                                                    hover:bg-blue-50
                                                                    hover:text-blue-600
                                                                    disabled:cursor-not-allowed
                                                                    disabled:opacity-50
                                                                "
                                                            aria-label={`Rename ${wishlist.name}`}
                                                        >
                                                            <svg
                                                                xmlns="http://www.w3.org/2000/svg"
                                                                className="h-4 w-4"
                                                                fill="none"
                                                                viewBox="0 0 24 24"
                                                                stroke="currentColor"
                                                            >
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    strokeWidth={2}
                                                                    d="M15.232 5.232l3.536 3.536M4 20h4l10.5-10.5a2.121 2.121 0 10-3-3L5 17v3z"
                                                                />
                                                            </svg>
                                                        </button>

                                                        {/* Delete */}
                                                        <button
                                                            type="button"
                                                            disabled={
                                                                isDeleting ||
                                                                isRenaming
                                                            }
                                                            onClick={(e) =>
                                                                handleDeleteWishlist(
                                                                    e,
                                                                    wishlist.id
                                                                )
                                                            }
                                                            className="
                                                                    mr-2
                                                                    flex
                                                                    h-8
                                                                    w-8
                                                                    shrink-0
                                                                    items-center
                                                                    justify-center
                                                                    rounded-md
                                                                    text-gray-400
                                                                    hover:bg-red-50
                                                                    hover:text-red-600
                                                                    disabled:cursor-not-allowed
                                                                    disabled:opacity-50
                                                                "
                                                            aria-label={`Delete ${wishlist.name}`}
                                                        >
                                                            {isDeleting ? (
                                                                <svg
                                                                    className="h-4 w-4 animate-spin"
                                                                    viewBox="0 0 24 24"
                                                                    fill="none"
                                                                >
                                                                    <circle
                                                                        className="opacity-25"
                                                                        cx="12"
                                                                        cy="12"
                                                                        r="10"
                                                                        stroke="currentColor"
                                                                        strokeWidth="4"
                                                                    />
                                                                    <path
                                                                        className="opacity-75"
                                                                        fill="currentColor"
                                                                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                                                                    />
                                                                </svg>
                                                            ) : (
                                                                <svg
                                                                    xmlns="http://www.w3.org/2000/svg"
                                                                    className="h-4 w-4"
                                                                    fill="none"
                                                                    viewBox="0 0 24 24"
                                                                    stroke="currentColor"
                                                                >
                                                                    <path
                                                                        strokeLinecap="round"
                                                                        strokeLinejoin="round"
                                                                        strokeWidth={2}
                                                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 0V4a1 1 0 011-1h4a1 1 0 011 1v3m-9 0h14M10 11v6M14 11v6"
                                                                    />
                                                                </svg>
                                                            )}
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                            </div>

                            {/* Products */}
                            <div className="lg:col-span-3">
                                {activeWishlist ? (
                                    <>
                                        <div className="flex items-center justify-between mb-5">
                                            <div>
                                                <h2 className="text-2xl font-semibold">
                                                    {
                                                        activeWishlist.name
                                                    }
                                                </h2>

                                                <p className="text-sm text-gray-500 mt-1">
                                                    {
                                                        activeWishlist
                                                            .products
                                                            .length
                                                    }{' '}
                                                    {activeWishlist
                                                        .products
                                                        .length ===
                                                    1
                                                        ? 'product'
                                                        : 'products'}
                                                </p>
                                            </div>
                                        </div>

                                        {!hasWishlistInventory || wishlistInventory.status === 'loading' ? (
                                            <p className="py-8 text-center text-sm text-gray-500">
                                                Loading product availability...
                                            </p>
                                        ) : wishlistInventory.status === 'error' ? (
                                            <p className="py-8 text-center text-sm text-red-600">
                                                Product availability could not be loaded. Please refresh and try again.
                                            </p>
                                        ) : paginatedProducts
                                            .length === 0 ? (
                                            <EmptyWishlist
                                                message={`Your "${activeWishlist.name}" wishlist is empty.`}
                                            />
                                        ) : (
                                            <>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                                    {paginatedProducts.map(
                                                        (
                                                            product
                                                        ) => (
                                                            <ProductCard
                                                                key={
                                                                    product.id
                                                                }
                                                                product={
                                                                    product
                                                                }
                                                                availableQuantity={
                                                                    wishlistInventory.quantities[product.masterVariant?.sku ?? ''] ?? 0
                                                                }
                                                                variantQuantities={wishlistInventory.quantities}
                                                                storeAvailable={wishlistInventory.storeAvailability[product.id]}
                                                                activeWishlistName={activeWishlist.name}
                                                                activeWishlistId={activeWishlist.id}
                                                            />
                                                        )
                                                    )}
                                                </div>
                                                {total > limit && (
                                                    <div className="mt-8">
                                                        <Pagination
                                                            total={total}
                                                            limit={limit}
                                                            currentPage={currentPage}
                                                        />
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </>
                                ) : (
                                    <EmptyWishlist />
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {showAddToWishlistPopup && (
                <AddToWishlistPopup
                    setShowWishlistPopup={setShowAddToWishlistPopup}
                    setShowCreateWishlist={setShowCreateWishlist}
                    createOnly
                />
            )}

            {showCreateWishlist && (
                <CreateWishlistPopup
                    creatingWishlist={creatingWishlist}
                    setShowCreateWishlist={setShowCreateWishlist}
                    handleCreateWishlist={handleCreateWishlist}
                    wishlistName={wishlistName}
                    setWishlistName={setWishlistName}
                    wishlistNameError={wishlistNameError}
                    setWishlistNameError={setWishlistNameError}
                />
            )}

            <ConfirmDeleteModal
                isOpen={wishlistToDelete !== null}
                title="Delete wishlist?"
                isDeleting={deletingWishlistId !== null}
                onConfirm={handleConfirmDeleteWishlist}
                onCancel={() => {
                    if (!deletingWishlistId) {
                        setWishlistToDelete(null);
                    }
                }}
                name={wishlistToDelete ? wishlists.find((wishlist) => wishlist.id === wishlistToDelete)?.name : ''}
            />
        </div>
    );
}

function EmptyWishlist({
                           message = 'You have not created any wishlist yet.',
                       }: {
    message?: string;
}) {
    return (
        <div className="bg-white rounded-lg border border-gray-200 p-10 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 text-gray-400 mb-4">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-8 w-8"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                </svg>
            </div>

            <h2 className="text-xl font-semibold mb-2">
                Your wishlist is empty
            </h2>

            <p className="text-gray-500">
                {message}
            </p>
        </div>
    );
}
