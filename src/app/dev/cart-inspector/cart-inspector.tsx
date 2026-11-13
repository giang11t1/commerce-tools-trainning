'use client';

import { useState, type FormEvent } from 'react';

type InspectorMoney = {
    type: string;
    currencyCode: string;
    centAmount?: number;
    preciseAmount?: number;
    fractionDigits?: number;
};

type InspectedCart = {
    id: string;
    version: number;
    currency: string;
    country: string | null;
    cartState: string;
    lineItems: Array<{
        id: string;
        name: string;
        sku: string | null;
        quantity: number;
        unitPrice: InspectorMoney;
        totalPrice: InspectorMoney;
    }>;
    totalPrice: InspectorMoney;
};

function formatMoney(money: InspectorMoney) {
    const fractionDigits = money.fractionDigits ?? 2;
    const amount =
        money.preciseAmount !== undefined
            ? money.preciseAmount / 10 ** fractionDigits
            : (money.centAmount ?? 0) / 10 ** fractionDigits;

    return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: money.currencyCode,
    }).format(amount);
}

export default function CartInspector({ enabled }: { enabled: boolean }) {
    const [source, setSource] = useState<'active' | 'id'>('active');
    const [cartId, setCartId] = useState('');
    const [accessToken, setAccessToken] = useState('');
    const [cart, setCart] = useState<InspectedCart | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [activeResult, setActiveResult] = useState<{ cookieCartId: string | null } | null>(null);

    const inspectCart = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);
        setCart(null);
        setActiveResult(null);
        setIsLoading(true);

        try {
            const response = await fetch('/api/dev/cart-inspector', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(
                    source === 'active' ? { source: 'active' } : { cartId: cartId.trim() },
                ),
                credentials: 'same-origin',
                cache: 'no-store',
            });
            const result = (await response.json()) as {
                cart?: InspectedCart | null;
                cookieCartId?: string | null;
                error?: string;
            };

            if (!response.ok) {
                setCart(null);
                setError(result.error ?? 'The cart could not be loaded.');
                return;
            }

            if (source === 'active') {
                setActiveResult({ cookieCartId: result.cookieCartId ?? null });
            }
            setCart(result.cart ?? null);
        } catch {
            setCart(null);
            setError('The cart could not be loaded. Check the connection and try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
            <header className="border-b border-line pb-7">
                <p className="text-sm font-medium text-ink-muted">Developer utility</p>
                <h1 className="mt-2 text-3xl font-bold text-ink">Cart inspector</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-muted">
                    Read a cart from the configured commercetools project without changing
                    the storefront cart or customer session.
                </p>
            </header>

            {!enabled ? (
                <p className="mt-6 rounded-control border border-line bg-surface p-4 text-sm text-ink">
                    This inspector is disabled. Configure a server-only
                    {' '}<code>CART_INSPECTOR_ACCESS_TOKEN</code> with at least 32 characters
                    to enable authorized developer access.
                </p>
            ) : (
                <>
                    <form
                        className="mt-7 grid gap-4 rounded-surface border border-line bg-surface p-5 shadow-surface sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end"
                        onSubmit={inspectCart}
                    >
                        <label className="block min-w-0 sm:col-span-3">
                            <span className="mb-1.5 block text-sm font-medium text-ink">
                                Cart source
                            </span>
                            <select
                                className="rounded-control border border-gray-300 bg-white px-3 py-2 text-sm text-ink"
                                disabled={isLoading}
                                value={source}
                                onChange={(event) => {
                                    setSource(event.target.value === 'active' ? 'active' : 'id');
                                    setCart(null);
                                    setActiveResult(null);
                                    setError(null);
                                }}
                            >
                                <option value="active">Active storefront cart (cartId cookie)</option>
                                <option value="id">Look up a cart by ID</option>
                            </select>
                        </label>
                        <label className="block min-w-0">
                            <span className="mb-1.5 block text-sm font-medium text-ink">
                                Cart ID
                            </span>
                            <input
                                autoComplete="off"
                                className="w-full rounded-control border border-gray-300 bg-white px-3 py-2 text-sm text-ink outline-none focus-visible:outline-blue-600"
                                onChange={(event) => setCartId(event.target.value)}
                                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                                disabled={source === 'active' || isLoading}
                                required={source === 'id'}
                                spellCheck={false}
                                value={cartId}
                            />
                        </label>
                        <label className="block min-w-0">
                            <span className="mb-1.5 block text-sm font-medium text-ink">
                                Developer access token
                            </span>
                            <input
                                autoComplete="new-password"
                                className="w-full rounded-control border border-gray-300 bg-white px-3 py-2 text-sm text-ink outline-none focus-visible:outline-blue-600"
                                onChange={(event) => setAccessToken(event.target.value)}
                                required
                                type="password"
                                value={accessToken}
                            />
                        </label>
                        <button
                            className="min-h-10 rounded-control bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:cursor-wait disabled:opacity-60"
                            disabled={isLoading || (source === 'id' && !cartId.trim()) || !accessToken}
                            type="submit"
                        >
                            {isLoading ? 'Reading…' : cart ? 'Refresh cart' : 'Read cart'}
                        </button>
                    </form>

                    <p className="mt-3 text-xs leading-5 text-ink-muted">
                        The access token stays in this page’s memory and is sent only to
                        this server. It is not saved in browser storage.
                    </p>

                    {activeResult && (
                        <div className="mt-6 rounded-control border border-line bg-surface p-4 text-sm">
                            <p className="break-all">
                                HttpOnly cartId cookie: {activeResult.cookieCartId ?? 'Not set'}
                            </p>
                            {!cart && (
                                <p className="mt-2 text-ink-muted">
                                    {activeResult.cookieCartId
                                        ? 'No readable active cart was returned. It may be missing, inactive, or belong to another customer.'
                                        : 'This browser has no active cart cookie.'}
                                </p>
                            )}
                        </div>
                    )}

                    {error && (
                        <p
                            aria-live="polite"
                            className="mt-6 rounded-control border border-red-300 bg-red-100 p-4 text-sm text-red-700"
                            role="alert"
                        >
                            {error}
                        </p>
                    )}

                    {cart && (
                        <section
                            aria-label="Inspected cart"
                            className="mt-8 overflow-hidden rounded-surface border border-line bg-surface shadow-surface"
                        >
                            <div className="grid gap-4 border-b border-line p-5 sm:grid-cols-2 lg:grid-cols-4">
                                <Metadata label="Cart ID" value={cart.id} />
                                <Metadata label="Version" value={String(cart.version)} />
                                <Metadata label="Currency" value={cart.currency} />
                                <Metadata label="Country" value={cart.country ?? 'Not set'} />
                                <Metadata label="Cart state" value={cart.cartState} />
                                <Metadata label="Total price" value={formatMoney(cart.totalPrice)} />
                            </div>

                            <div className="p-5">
                                <h2 className="text-lg font-semibold text-ink">Line items</h2>
                                {cart.lineItems.length === 0 ? (
                                    <p className="mt-3 text-sm text-ink-muted">
                                        This cart has no line items.
                                    </p>
                                ) : (
                                    <div className="mt-4 overflow-x-auto">
                                        <table className="w-full min-w-[38rem] text-left text-sm">
                                            <thead className="border-b border-line text-xs text-ink-muted">
                                                <tr>
                                                    <th className="pb-3 pr-4 font-medium" scope="col">Item</th>
                                                    <th className="pb-3 pr-4 font-medium" scope="col">SKU</th>
                                                    <th className="pb-3 pr-4 text-right font-medium" scope="col">Quantity</th>
                                                    <th className="pb-3 pr-4 text-right font-medium" scope="col">Unit price</th>
                                                    <th className="pb-3 text-right font-medium" scope="col">Line total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200">
                                                {cart.lineItems.map((item) => (
                                                    <tr key={item.id}>
                                                        <th className="py-4 pr-4 font-medium text-ink" scope="row">
                                                            {item.name}
                                                        </th>
                                                        <td className="py-4 pr-4 text-ink-muted">
                                                            {item.sku ?? '—'}
                                                        </td>
                                                        <td className="py-4 pr-4 text-right tabular-nums text-ink">
                                                            {item.quantity}
                                                        </td>
                                                        <td className="py-4 pr-4 text-right tabular-nums text-ink">
                                                            {formatMoney(item.unitPrice)}
                                                        </td>
                                                        <td className="py-4 text-right tabular-nums text-ink">
                                                            {formatMoney(item.totalPrice)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </section>
                    )}
                </>
            )}
        </main>
    );
}

function Metadata({ label, value }: { label: string; value: string }) {
    return (
        <div className="min-w-0">
            <dt className="text-xs font-medium text-ink-muted">{label}</dt>
            <dd className="mt-1 break-all text-sm font-medium text-ink">{value}</dd>
        </div>
    );
}
