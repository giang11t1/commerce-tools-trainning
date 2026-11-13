'use client';

import { FormEvent, useMemo, useState } from 'react';
import AccountSidebar from '@/components/AccountSidebar';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import type { Wishlist } from '@/context/WishlistContext';
import { useLocale, useTranslations } from 'use-intl';

export default function ShoppingListsPage() {
    const translate = useTranslations('shoppingLists');
    const locale = useLocale();
    const {
        wishlists,
        loaded,
        loadError,
        reloadWishlists,
        createWishlist,
        renameWishlist,
        deleteWishlist,
        removeProductFromWishlist,
        updateLineItemQuantity,
    } = useWishlist();
    const { addToCart } = useCart();
    const [activeListId, setActiveListId] = useState<string | null>(null);
    const [newListName, setNewListName] = useState('');
    const [editingListId, setEditingListId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const [working, setWorking] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [quantityDrafts, setQuantityDrafts] = useState<Record<string, string>>({});

    const activeList = useMemo(
        () => wishlists.find((list) => list.id === activeListId) ?? wishlists[0] ?? null,
        [activeListId, wishlists],
    );

    const handleCreateList = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const name = newListName.trim();
        if (!name || working) return;

        setWorking('create');
        setError(null);
        setSuccess(null);
        try {
            const duplicate = wishlists.some(
                (list) => list.name.trim().toLowerCase() === name.toLowerCase(),
            );
            if (duplicate) {
                throw new Error(translate('duplicateName'));
            }

            const list = await createWishlist(name);
            setNewListName('');
            setActiveListId(list.id);
            setSuccess(translate('created'));
        } catch (createError) {
            setError(
                createError instanceof Error
                    ? createError.message
                    : translate('createFailed'),
            );
        } finally {
            setWorking(null);
        }
    };

    const handleRename = async (event: FormEvent<HTMLFormElement>, list: Wishlist) => {
        event.preventDefault();
        const name = editingName.trim();
        if (!name || working) return;

        setWorking(`rename:${list.id}`);
        setError(null);
        setSuccess(null);
        try {
            const duplicate = wishlists.some(
                (other) =>
                    other.id !== list.id &&
                    other.name.trim().toLowerCase() === name.toLowerCase(),
            );
            if (duplicate) {
                throw new Error(translate('duplicateName'));
            }

            await renameWishlist(list.id, name);
            setEditingListId(null);
            setSuccess(translate('renamed'));
        } catch (renameError) {
            setError(
                renameError instanceof Error
                    ? renameError.message
                    : translate('renameFailed'),
            );
        } finally {
            setWorking(null);
        }
    };

    const handleDelete = async (list: Wishlist) => {
        if (working || !window.confirm(translate('deleteConfirm', { name: list.name }))) {
            return;
        }

        setWorking(`delete:${list.id}`);
        setError(null);
        setSuccess(null);
        try {
            await deleteWishlist(list.id);
            setSuccess(translate('deleted'));
        } catch (deleteError) {
            setError(
                deleteError instanceof Error
                    ? deleteError.message
                    : translate('deleteFailed'),
            );
        } finally {
            setWorking(null);
        }
    };

    const handleRemoveItem = async (list: Wishlist, lineItemId: string) => {
        setWorking(`remove:${lineItemId}`);
        setError(null);
        setSuccess(null);
        try {
            await removeProductFromWishlist(list.id, lineItemId);
            setSuccess(translate('itemRemoved'));
        } catch (removeError) {
            setError(
                removeError instanceof Error
                    ? removeError.message
                    : translate('itemRemoveFailed'),
            );
        } finally {
            setWorking(null);
        }
    };

    const handleQuantityChange = async (
        list: Wishlist,
        lineItemId: string,
        quantity: number,
    ) => {
        setWorking(`quantity:${lineItemId}`);
        setError(null);
        setSuccess(null);
        try {
            await updateLineItemQuantity(list.id, lineItemId, quantity);
            setQuantityDrafts((current) => {
                const next = { ...current };
                delete next[lineItemId];
                return next;
            });
            setSuccess(translate('quantityUpdated'));
        } catch (quantityError) {
            setError(
                quantityError instanceof Error
                    ? quantityError.message
                    : translate('quantityFailed'),
            );
        } finally {
            setWorking(null);
        }
    };

    const handleAddAllToCart = async (list: Wishlist) => {
        if (!list.lineItems.length || working) return;

        setWorking(`cart:${list.id}`);
        setError(null);
        setSuccess(null);
        let addedCount = 0;
        try {
            for (const item of list.lineItems) {
                await addToCart(item.productId, item.variantId, item.quantity);
                addedCount += 1;
            }
            setSuccess(translate('addedToCart', { count: addedCount }));
        } catch (cartError) {
            const reason = cartError instanceof Error
                ? cartError.message
                : translate('cartFailed');
            setError(
                addedCount > 0
                    ? translate('cartPartialFailure', {
                        added: addedCount,
                        total: list.lineItems.length,
                        reason,
                    })
                    : reason,
            );
        } finally {
            setWorking(null);
        }
    };

    const getProductName = (list: Wishlist, productId: string, lineItemId: string) => {
        const item = list.lineItems.find((line) => line.id === lineItemId);
        const names = item?.product.name;
        return names?.[locale] ??
            names?.[locale === 'de' ? 'de-DE' : 'en-US'] ??
            (names ? Object.values(names)[0] : undefined) ??
            productId;
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="mb-8 text-3xl font-bold">{translate('title')}</h1>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                <div className="md:col-span-1">
                    <AccountSidebar />
                </div>

                <section className="space-y-6 md:col-span-2" aria-label={translate('title')}>
                    <form
                        onSubmit={handleCreateList}
                        className="flex flex-col gap-3 rounded-lg border border-gray-100 bg-white p-5 shadow-sm sm:flex-row"
                    >
                        <label className="sr-only" htmlFor="shopping-list-name">
                            {translate('nameLabel')}
                        </label>
                        <input
                            id="shopping-list-name"
                            value={newListName}
                            onChange={(event) => setNewListName(event.target.value)}
                            maxLength={100}
                            placeholder={translate('namePlaceholder')}
                            className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2"
                            disabled={working !== null}
                        />
                        <button
                            type="submit"
                            disabled={!newListName.trim() || working !== null}
                            className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {working === 'create' ? translate('creating') : translate('create')}
                        </button>
                    </form>

                    {loadError && (
                        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
                            <p>{loadError}</p>
                            <button
                                type="button"
                                onClick={() => void reloadWishlists()}
                                className="mt-2 font-semibold underline"
                            >
                                {translate('retry')}
                            </button>
                        </div>
                    )}
                    {error && (
                        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700" role="alert">
                            {error}
                        </p>
                    )}
                    {success && (
                        <p className="rounded-md bg-green-50 p-3 text-sm text-green-700" role="status">
                            {success}
                        </p>
                    )}

                    {!loaded ? (
                        <div className="animate-pulse space-y-3 rounded-lg bg-white p-6" aria-label={translate('loading')}>
                            <div className="h-6 w-40 rounded bg-gray-200" />
                            <div className="h-16 rounded bg-gray-100" />
                            <div className="h-16 rounded bg-gray-100" />
                        </div>
                    ) : wishlists.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
                            <h2 className="text-xl font-semibold">{translate('emptyTitle')}</h2>
                            <p className="mt-2 text-gray-600">{translate('emptyDescription')}</p>
                        </div>
                    ) : (
                        <div className="grid gap-6 lg:grid-cols-[minmax(12rem,0.8fr)_minmax(0,1.7fr)]">
                            <nav className="space-y-2" aria-label={translate('listNavigation')}>
                                {wishlists.map((list) => (
                                    <button
                                        key={list.id}
                                        type="button"
                                        onClick={() => {
                                            setActiveListId(list.id);
                                            setError(null);
                                            setSuccess(null);
                                        }}
                                        aria-current={
                                            activeList?.id === list.id ? 'true' : undefined
                                        }
                                        className={`w-full rounded-lg border px-4 py-3 text-left ${
                                            activeList?.id === list.id
                                                ? 'border-blue-600 bg-blue-50'
                                                : 'border-gray-200 bg-white hover:bg-gray-50'
                                        }`}
                                    >
                                        <span className="block font-semibold">{list.name}</span>
                                        <span className="text-sm text-gray-500">
                                            {translate('itemCount', { count: list.lineItems.length })}
                                        </span>
                                    </button>
                                ))}
                            </nav>

                            {activeList && (
                                <div className="min-w-0 rounded-lg border border-gray-100 bg-white p-5 shadow-sm">
                                    <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            {editingListId === activeList.id ? (
                                                <form
                                                    onSubmit={(event) => void handleRename(event, activeList)}
                                                    className="flex gap-2"
                                                >
                                                    <label className="sr-only" htmlFor="rename-shopping-list">
                                                        {translate('nameLabel')}
                                                    </label>
                                                    <input
                                                        id="rename-shopping-list"
                                                        value={editingName}
                                                        onChange={(event) => setEditingName(event.target.value)}
                                                        maxLength={100}
                                                        className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2"
                                                        disabled={working !== null}
                                                        autoFocus
                                                    />
                                                    <button
                                                        type="submit"
                                                        disabled={!editingName.trim() || working !== null}
                                                        className="rounded-md bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-50"
                                                    >
                                                        {translate('save')}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditingListId(null)}
                                                        disabled={working !== null}
                                                        className="rounded-md border px-3 py-2 text-sm disabled:opacity-50"
                                                    >
                                                        {translate('cancel')}
                                                    </button>
                                                </form>
                                            ) : (
                                                <>
                                                    <h2 className="break-words text-xl font-semibold">
                                                        {activeList.name}
                                                    </h2>
                                                    <p className="mt-1 text-sm text-gray-500">
                                                        {translate('itemCount', { count: activeList.lineItems.length })}
                                                    </p>
                                                </>
                                            )}
                                        </div>
                                        {editingListId !== activeList.id && (
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setEditingListId(activeList.id);
                                                        setEditingName(activeList.name);
                                                    }}
                                                    disabled={working !== null}
                                                    className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
                                                >
                                                    {translate('rename')}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => void handleDelete(activeList)}
                                                    disabled={working !== null}
                                                    className="rounded-md border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
                                                >
                                                    {working === `delete:${activeList.id}`
                                                        ? translate('deleting')
                                                        : translate('delete')}
                                                </button>
                                            </div>
                                        )}
                                    </header>

                                    {activeList.lineItems.length === 0 ? (
                                        <div className="rounded-md bg-gray-50 px-4 py-10 text-center text-gray-600">
                                            {translate('emptyList')}
                                        </div>
                                    ) : (
                                        <>
                                            <ul className="divide-y divide-gray-100">
                                                {activeList.lineItems.map((item) => {
                                                    const variant = item.product.masterVariant.id === item.variantId
                                                        ? item.product.masterVariant
                                                        : item.product.variants.find(
                                                            (candidate) => candidate.id === item.variantId,
                                                        );
                                                    const isBusy = working === `quantity:${item.id}` ||
                                                        working === `remove:${item.id}`;

                                                    return (
                                                        <li key={item.id} className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                                                            <div className="min-w-0">
                                                                <h3 className="font-medium text-gray-900">
                                                                    {getProductName(activeList, item.productId, item.id)}
                                                                </h3>
                                                                <p className="mt-1 text-sm text-gray-500">
                                                                    {variant?.sku ?? item.productId}
                                                                </p>
                                                            </div>
                                                            <div className="flex items-center justify-between gap-4 sm:justify-end">
                                                                <label className="flex items-center gap-2 text-sm text-gray-700">
                                                                    {translate('quantity')}
                                                                    <input
                                                                        type="number"
                                                                        min={1}
                                                                        max={999}
                                                                        value={quantityDrafts[item.id] ?? item.quantity}
                                                                        disabled={isBusy || working !== null}
                                                                        onChange={(event) => {
                                                                            setQuantityDrafts((current) => ({
                                                                                ...current,
                                                                                [item.id]: event.target.value,
                                                                            }));
                                                                        }}
                                                                        onBlur={() => {
                                                                            const draft = quantityDrafts[item.id];
                                                                            if (draft === undefined) return;
                                                                            const quantity = Number(draft);
                                                                            if (
                                                                                Number.isInteger(quantity) &&
                                                                                quantity > 0 &&
                                                                                quantity <= 999 &&
                                                                                quantity !== item.quantity
                                                                            ) {
                                                                                void handleQuantityChange(
                                                                                    activeList,
                                                                                    item.id,
                                                                                    quantity,
                                                                                );
                                                                            } else {
                                                                                setQuantityDrafts((current) => {
                                                                                    const next = { ...current };
                                                                                    delete next[item.id];
                                                                                    return next;
                                                                                });
                                                                            }
                                                                        }}
                                                                        className="w-20 rounded-md border border-gray-300 px-2 py-1"
                                                                    />
                                                                </label>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => void handleRemoveItem(activeList, item.id)}
                                                                    disabled={working !== null}
                                                                    className="text-sm font-medium text-red-700 hover:underline disabled:opacity-50"
                                                                >
                                                                    {translate('remove')}
                                                                </button>
                                                            </div>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                            <button
                                                type="button"
                                                onClick={() => void handleAddAllToCart(activeList)}
                                                disabled={working !== null}
                                                className="mt-5 w-full rounded-md bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                {working === `cart:${activeList.id}`
                                                    ? translate('addingToCart')
                                                    : translate('addAllToCart')}
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
