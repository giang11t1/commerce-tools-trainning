import Link from '@/components/commercetools-ui/atoms/link';
import type { ProductProjection } from '@commercetools/platform-sdk';
import { getCategories } from '@/lib/categories';
import CategoryProductList from "@/components/CategoryProductList";
import SearchSidebar from '@/components/SearchSidebar';
import {getProductRating} from "@/lib/reviews";
import {getInventoryMapBySkus} from "@/lib/inventory";
import { searchProducts } from '@/lib/product-search';
import { getBrands } from '@/lib/brands';
import { getLocale, getTranslations } from 'next-intl/server';
import { getLocalizationInfo } from '@/../project.config';
import ActiveFilterItem from '@/components/ActiveFilterItem';
import ClearAllFiltersButton from '@/components/ClearAllFiltersButton';
import { formatMarketPrice, getCommerceMarket } from '@/lib/commerce-market';

interface SearchPageProps {
    searchParams: Promise<{
        q?: string;
        sort?: string;
        minPrice?: string;
        maxPrice?: string;
        brand?: string;
        page?: string;
    }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
    const { q, sort, minPrice, maxPrice, brand: brandKeyParam, page } = await searchParams;
    const query = q?.trim() || '';
    const parsedPage = Number.parseInt(page || '1', 10);
    const currentPage = Number.isFinite(parsedPage) ? Math.max(1, parsedPage) : 1;
    const limit = 15;
    const offset = (currentPage - 1) * limit;
    const [locale, translate, productTranslate] = await Promise.all([
        getLocale(),
        getTranslations('common'),
        getTranslations('product'),
    ]);
    const ctLocale = getLocalizationInfo(locale).locale;
    const market = getCommerceMarket(locale);

    let results: ProductProjection[] = [];
    let total = 0;
    let error: string | null = null;

    const [categories, brands] = await Promise.all([getCategories(), getBrands()]);
    const selectedBrand = brands.find((brand) => brand.key === brandKeyParam);

    if (query && brandKeyParam && !selectedBrand) {
        total = 0;
    } else if (query) {
        try {
            const parsedMinPrice = minPrice ? Number.parseFloat(minPrice) : undefined;
            const parsedMaxPrice = maxPrice ? Number.parseFloat(maxPrice) : undefined;
            const response = await searchProducts({
                query,
                locale: ctLocale,
                limit,
                offset,
                ...(parsedMinPrice !== undefined && Number.isFinite(parsedMinPrice) && { minPrice: parsedMinPrice }),
                ...(parsedMaxPrice !== undefined && Number.isFinite(parsedMaxPrice) && { maxPrice: parsedMaxPrice }),
                ...(selectedBrand && { brandKey: selectedBrand.key }),
                sort,
            });
            results = response.results;
            total = response.total;
        } catch {
            error = translate('searchUnavailable');
        }
    }

    const productsWithRatings = await Promise.all(
        results.map(async (product) => ({
            product,
            rating: await getProductRating(product.id),
        })),
    );

    const skus = results
        .map((product) => product.masterVariant.sku)
        .filter(Boolean) as string[];

    const inventoryMap = await getInventoryMapBySkus(skus);
    const activeFilters = [];
    const parsedMinPrice = minPrice ? Number.parseFloat(minPrice) : undefined;
    const parsedMaxPrice = maxPrice ? Number.parseFloat(maxPrice) : undefined;
    if (parsedMinPrice !== undefined && Number.isFinite(parsedMinPrice)) {
        activeFilters.push({ label: `Min: ${formatMarketPrice(parsedMinPrice, market)}`, key: 'minPrice' });
    }
    if (parsedMaxPrice !== undefined && Number.isFinite(parsedMaxPrice)) {
        activeFilters.push({ label: `Max: ${formatMarketPrice(parsedMaxPrice, market)}`, key: 'maxPrice' });
    }
    if (brandKeyParam) {
        activeFilters.push({
            label: `${productTranslate('brand')}: ${selectedBrand?.name ?? brandKeyParam}`,
            key: 'brand',
        });
    }

    const productsWithInventory = productsWithRatings.map(
        ({ product, rating }) => ({
            product,
            rating,
            availableQuantity:
                inventoryMap[product.masterVariant.sku ?? ''] ??
                product.masterVariant.availability?.availableQuantity ?? 0,
        })
    );

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col gap-4 mb-8">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Link link="/" className="hover:text-blue-600">Home</Link>
                    <span>/</span>
                    <span className="font-medium text-gray-900">Search</span>
                </div>
                <div className="flex flex-col items-center justify-center gap-4 mb-10">
                    <h1 className="text-[40px] font-bold text-[#3F51B5]">
                        {query ? `Search results for "${query}"` : 'Search'}
                    </h1>
                    {query && !error && (
                        <p className="text-gray-600">
                            Found {total} {total === 1 ? 'product' : 'products'}
                        </p>
                    )}
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-8">
                    <p role="alert">{error}</p>
                </div>
            )}

            <div className="flex flex-col md:flex-row gap-8">

                <SearchSidebar categories={categories} brands={brands} />

                <div className="flex-1">
                    {activeFilters.length > 0 && (
                        <div className="mb-6 flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium text-gray-700">Filters:</span>
                            {activeFilters.map((filter) => (
                                <ActiveFilterItem
                                    key={filter.key}
                                    label={filter.label}
                                    filterKey={filter.key}
                                />
                            ))}
                            <ClearAllFiltersButton />
                        </div>
                    )}
                    {!query ? (
                        <div className="text-center py-12 border rounded-lg bg-white">
                            <p className="text-gray-500">Please enter a search term.</p>
                        </div>
                    ) : error ? null : results.length === 0 ? (
                        <div className="text-center py-12 border rounded-lg bg-white">
                            <p className="text-gray-500">No products found for &quot;{query}&quot;.</p>
                        </div>
                    ) : (
                        <CategoryProductList
                            products={productsWithInventory}
                            total={total}
                            limit={limit}
                            currentPage={currentPage}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
