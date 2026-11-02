'use client';

import { useState, useEffect, useRef } from 'react';
import Link from '@/components/commercetools-ui/atoms/link';
import {usePathname, useRouter} from 'next/navigation';
import useScrollDirection from '@/helpers/hooks/useScrollDirection';
import { ProductProjection } from '@commercetools/platform-sdk';
import {useLocale, useTranslations} from "use-intl";
import {getLocalizationInfo} from "../../project.config";
import useClassNames from "@/helpers/hooks/useClassNames";
import { formatMoney, hasDiscountedPrice } from '@/lib/checkout-utils';

const RECENT_PRODUCTS_KEY = 'recent-search-products';
const MAX_RECENT_PRODUCTS = 5;

interface RecentProduct {
    id: string;
    name: string;
    slug: string;
    image?: string;
    price?: string;
}

interface SearchSuggestionsProps {
    isSearchOpen?: boolean;
}

function getLocalizedValue(
    value: Record<string, string> | undefined,
    locale: string,
): string {
    if (!value) return '';

    if (value[locale]) {
        return value[locale];
    }

    const language = locale.split('-')[0];

    const key = Object.keys(value).find(
        (key) => key.split('-')[0] === language,
    );

    return key ? value[key] : Object.values(value)[0] ?? '';
}

export default function SearchSuggestions({
                                              isSearchOpen,
                                          }: SearchSuggestionsProps) {
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<ProductProjection[]>([]);
    const [recentProducts, setRecentProducts] = useState<RecentProduct[]>(() => {
        if (typeof window === 'undefined') {
            return [];
        }

        try {
            const stored = localStorage.getItem(RECENT_PRODUCTS_KEY);
            const parsed: unknown = stored ? JSON.parse(stored) : [];

            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            console.error('Error loading recent products:', error);
            return [];
        }
    });
    const [total, setTotal] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [searchError, setSearchError] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);

    const wrapperRef = useRef<HTMLDivElement>(null!);
    const inputRef = useRef<HTMLInputElement>(null!);

    const locale = useLocale();
    const ctLocale = getLocalizationInfo(locale).locale;

    const router = useRouter();
    const pathname = usePathname();
    const isCheckoutPage = pathname === '/checkout';
    const scrollDirection = useScrollDirection(5, -1);

    const searchClassNames = useClassNames([
        'flex items-center absolute top-16 left-0 right-0 lg:static w-full duration-150 transition-all overflow-hidden ',
        isSearchOpen && scrollDirection === 'down'
            ? 'h-12 opacity-100 pointer-events-auto px-6 my-4 lg:px-0 lg:my-0'
            : 'h-0 opacity-0 pointer-events-none',

        scrollDirection === 'up'
            ? 'h-12 opacity-100 pointer-events-auto px-6 my-4 lg:px-0 lg:my-0'
            : 'h-0 opacity-0 pointer-events-none',
    ]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                wrapperRef.current &&
                !wrapperRef.current.contains(event.target as Node)
            ) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Search products
    useEffect(() => {
        const abortController = new AbortController();
        const timer = setTimeout(async () => {
            if (query.length > 2) {
                setIsLoading(true);
                setSearchError(false);

                try {
                    const response = await fetch(
                        `/api/products/search?q=${encodeURIComponent(query)}&locale=${encodeURIComponent(locale)}`,
                        { signal: abortController.signal },
                    );

                    const data = await response.json();
                    if (!response.ok || data.error) {
                        throw new Error(data.error || `Search request failed (${response.status})`);
                    }
                    setSuggestions(data.results);
                    setTotal(data.total || 0);
                } catch (error) {
                    if (abortController.signal.aborted) {
                        return;
                    }

                    console.error('Autocomplete search request failed', error);

                    setSuggestions([]);
                    setTotal(0);
                    setSearchError(true);
                } finally {
                    if (!abortController.signal.aborted) {
                        setIsLoading(false);
                    }
                }
            } else {
                setSuggestions([]);
                setTotal(0);
                setSearchError(false);
                setIsLoading(false);
            }
        }, 300);

        return () => {
            clearTimeout(timer);
            abortController.abort();
        };
    }, [query, locale]);

    useEffect(() => {
        console.log('Suggestions updated:', suggestions);
    }, [suggestions]);

    const getProductName = (
        product: ProductProjection
    ) => {
        return (
            product.name?.['en-US'] ||
            product.name?.['en-GB'] ||
            product.name?.['en'] ||
            Object.values(product.name || {})[0] ||
            ''
        );
    };

    const getProductSlug = (
        product: ProductProjection
    ) => {
        return (
            product.slug?.['en-US'] ||
            product.slug?.['en-GB'] ||
            product.slug?.['en'] ||
            Object.values(product.slug || {})[0] ||
            product.id
        );
    };

    const getProductPrice = (
        product: ProductProjection
    ) => {
        const price =
            product.masterVariant.price ??
            product.masterVariant.prices?.[0];

        if (!price) {
            return '';
        }

        const discountedPrice = hasDiscountedPrice(
            price.value,
            price.discounted?.value,
        )
            ? price.discounted
            : undefined;
        const currentPrice = discountedPrice || price;

        return formatMoney(currentPrice.value, ctLocale);
    };

    const saveRecentProduct = (
        product: ProductProjection
    ) => {
        const recentProduct: RecentProduct = {
            id: product.id,
            name: getProductName(product),
            slug: getProductSlug(product),
            image: product.masterVariant.images?.[0]?.url,
            price: getProductPrice(product),
        };

        const updatedProducts = [
            recentProduct,
            ...recentProducts.filter(
                (item) => item.id !== product.id
            ),
        ].slice(0, MAX_RECENT_PRODUCTS);

        setRecentProducts(updatedProducts);

        try {
            localStorage.setItem(
                RECENT_PRODUCTS_KEY,
                JSON.stringify(updatedProducts)
            );
        } catch (error) {
            console.error(
                'Error saving recent product:',
                error
            );
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();

        if (query.trim()) {
            setShowSuggestions(false);

            router.push(
                `/search?q=${encodeURIComponent(query)}`
            );
        }
    };

    const handleClear = () => {
        setQuery('');
        setSuggestions([]);
        setTotal(0);

        if (recentProducts.length > 0) {
            setShowSuggestions(true);
        }

        inputRef.current?.focus();
    };

    const handleProductClick = (
        product: ProductProjection
    ) => {
        saveRecentProduct(product);
        setShowSuggestions(false);
    };

    const handleClearRecent = () => {
        setRecentProducts([]);

        localStorage.removeItem(
            RECENT_PRODUCTS_KEY
        );
    };

    const translate = useTranslations();

    return (
        <>
            {!isCheckoutPage && (
                <div
                    ref={wrapperRef}
                    className="relative w-full"
                >
                    <form
                        onSubmit={handleSearch}
                        className="relative flex items-center"
                    >
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder={`${translate('common.search-placeholder')}...`}
                            value={query}
                            onChange={(e) => {
                                const nextQuery = e.target.value;
                                setQuery(nextQuery);
                                setShowSuggestions(
                                    nextQuery.length > 2 ||
                                        (nextQuery.length === 0 &&
                                            recentProducts.length > 0),
                                );
                            }}
                            onFocus={() => {
                                if (
                                    query.length > 2 ||
                                    (!query &&
                                        recentProducts.length > 0)
                                ) {
                                    setShowSuggestions(true);
                                }
                            }}
                            className="h-12 w-full rounded-md border border-[#707070] py-1 pr-16 pl-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />

                        <div className="absolute right-3 flex items-center gap-2">
                            {query && (
                                <button
                                    type="button"
                                    onClick={handleClear}
                                    className="text-gray-400 hover:text-gray-600 focus:outline-none"
                                    aria-label="Clear search"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-6 w-6"
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
                            )}

                            <button
                                type="submit"
                                className="h-6 w-6 text-gray-400 hover:text-blue-500 transition-colors"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                    />
                                </svg>
                            </button>
                        </div>
                    </form>

                    {showSuggestions && (
                        <div className="absolute top-full mt-1 w-full bg-white rounded-md border border-gray-200 shadow-lg z-50 flex flex-col max-h-[400px]">

                            {/* RECENT PRODUCTS */}
                            {!query && recentProducts.length > 0 && (
                                <>
                                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                                        <h3 className="text-sm font-semibold text-gray-900">
                                            Recent products
                                        </h3>

                                        <button
                                            type="button"
                                            onClick={handleClearRecent}
                                            className="text-xs text-gray-400 hover:text-gray-600"
                                        >
                                            Clear
                                        </button>
                                    </div>

                                    <div className="overflow-y-auto p-2">
                                        <ul className="space-y-1">
                                            {recentProducts.map(
                                                (product) => (
                                                    <li
                                                        key={
                                                            product.id
                                                        }
                                                    >
                                                        <Link
                                                            link={`/products/${product.slug}`}
                                                            className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-md transition-colors"
                                                            onClick={() =>
                                                                setShowSuggestions(
                                                                    false
                                                                )
                                                            }
                                                        >
                                                            {product.image ? (
                                                                <img
                                                                    src={
                                                                        product.image
                                                                    }
                                                                    alt={
                                                                        product.name
                                                                    }
                                                                    className="h-14 w-14 object-cover rounded"
                                                                />
                                                            ) : (
                                                                <div className="h-14 w-14 bg-gray-100 rounded flex items-center justify-center text-[10px] text-gray-400">
                                                                    No img
                                                                </div>
                                                            )}

                                                            <div className="flex flex-col overflow-hidden">
                                                            <span className="text-sm font-medium text-gray-900 truncate">
                                                                {
                                                                    product.name
                                                                }
                                                            </span>

                                                                {product.price && (
                                                                    <span className="text-xs text-blue-600 font-semibold">
                                                                    {
                                                                        product.price
                                                                    }
                                                                </span>
                                                                )}
                                                            </div>
                                                        </Link>
                                                    </li>
                                                )
                                            )}
                                        </ul>
                                    </div>
                                </>
                            )}

                            {/* SEARCH RESULTS */}
                            {query.length > 2 && (
                                <>
                                    {isLoading ? (
                                        <div className="p-4 text-center text-sm text-gray-500">
                                            Loading...
                                        </div>
                                    ) : searchError ? (
                                        <div role="alert" className="p-4 text-center text-sm text-red-600">
                                            {translate('common.searchUnavailable')}
                                        </div>
                                    ) : suggestions.length > 0 ? (
                                        <>
                                            <div className="flex-1 overflow-y-auto p-2">
                                                <ul className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                                                    {suggestions.map(
                                                        (product) => {
                                                            const name =
                                                                getProductName(
                                                                    product
                                                                );

                                                            const image =
                                                                product
                                                                    .masterVariant
                                                                    .images?.[0]
                                                                    ?.url;
                                                            const price =
                                                                product.masterVariant.price ??
                                                                product.masterVariant.prices?.[0];

                                                            const formattedPrice =
                                                                getProductPrice(
                                                                    product
                                                                );

                                                            const productSlug =
                                                                getProductSlug(
                                                                    product
                                                                );

                                                            return (
                                                                <li
                                                                    key={
                                                                        product.id
                                                                    }
                                                                >
                                                                    <Link
                                                                        link={`/products/${productSlug}`}
                                                                        className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors"
                                                                        onClick={() =>
                                                                            handleProductClick(
                                                                                product
                                                                            )
                                                                        }
                                                                    >
                                                                        {image ? (
                                                                            <img
                                                                                src={
                                                                                    image
                                                                                }
                                                                                alt={
                                                                                    name
                                                                                }
                                                                                className="h-20 w-20 object-cover rounded"
                                                                            />
                                                                        ) : (
                                                                            <div className="h-20 w-20 bg-gray-100 rounded flex items-center justify-center text-[10px] text-gray-400">
                                                                                No img
                                                                            </div>
                                                                        )}

                                                                        <div className="flex flex-col overflow-hidden">
                                                                    <span className="text-sm font-medium text-gray-900 truncate">
                                                                            {getLocalizedValue(product.name, ctLocale)}
                                                                    </span>

                                                                {formattedPrice && (
                                                                    <div className="flex items-baseline gap-2">
                                                                        {price?.discounted &&
                                                                        hasDiscountedPrice(
                                                                            price.value,
                                                                            price.discounted.value,
                                                                        ) ? (
                                                                            <>
                                                                                <span className="text-xs text-red-600 font-semibold">
                                                                                    {formattedPrice}
                                                                                </span>
                                                                                <span className="text-[10px] text-gray-500 line-through">
                                                                                    {formatMoney(
                                                                                        price.value,
                                                                                        ctLocale,
                                                                                    )}
                                                                                </span>
                                                                            </>
                                                                        ) : (
                                                                            <span className="text-xs text-blue-600 font-semibold">
                                                                                {formattedPrice}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                                    </Link>
                                                                </li>
                                                            );
                                                        }
                                                    )}
                                                </ul>
                                            </div>

                                            <div className="border-t border-gray-100 p-2 bg-white sticky bottom-0 rounded-b-md">
                                                <Link
                                                    link={`/search?q=${encodeURIComponent(query)}`}
                                                    className="block w-full text-center py-2 text-sm font-bold text-blue-600 hover:bg-blue-50 transition-colors rounded-md"
                                                    onClick={() =>
                                                        setShowSuggestions(
                                                            false
                                                        )
                                                    }
                                                >
                                                    View {total} results
                                                    for &quot;{query}&quot;
                                                </Link>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="p-4 text-center text-sm text-gray-500">
                                            No products found
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}
        </>
    );
}
