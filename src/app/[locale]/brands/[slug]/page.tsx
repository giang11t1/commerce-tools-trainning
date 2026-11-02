import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getBrands, getProductsByBrand } from '@/lib/brands';
import { getProductRating } from '@/lib/reviews';
import { getInventoryMapBySkus } from '@/lib/inventory';
import { getCommercetoolsErrorDetails } from '@/lib/category-product-search';
import BrandLogo from '@/components/BrandLogo';
import CategorySidebar from '@/components/CategorySidebar';
import ActiveFilterItem from '@/components/ActiveFilterItem';
import ClearAllFiltersButton from '@/components/ClearAllFiltersButton';
import CategoryProductList from '@/components/CategoryProductList';
import MobileFacets from '@/components/commercetools-ui/organisms/product/product-list/components/mobile-facets';
import { formatMarketPrice, getCommerceMarket } from '@/lib/commerce-market';

const PAGE_SIZE = 15;

export default async function BrandDetailPage({
    params,
    searchParams,
}: {
    params: Promise<{ locale: string; slug: string }>;
    searchParams: Promise<{
        page?: string | string[];
        sort?: string | string[];
        minPrice?: string | string[];
        maxPrice?: string | string[];
        color?: string | string[];
    }>;
}) {
    const [{ locale, slug }, query, translate, productTranslate] = await Promise.all([
        params,
        searchParams,
        getTranslations('brands'),
        getTranslations('product'),
    ]);
    const market = getCommerceMarket(locale);
    const brands = await getBrands();
    const brand = brands.find((item) => item.slug === slug);
    if (!brand) notFound();

    const firstValue = (value?: string | string[]) =>
        Array.isArray(value) ? value[0] : value;
    const pageParam = firstValue(query.page);
    const sort = firstValue(query.sort);
    const minPriceParam = firstValue(query.minPrice);
    const maxPriceParam = firstValue(query.maxPrice);
    const color = firstValue(query.color);
    const parsedPage = Number.parseInt(pageParam ?? '1', 10);
    const page = Number.isFinite(parsedPage) ? Math.max(1, parsedPage) : 1;
    const parsePrice = (value?: string) => {
        if (!value) return undefined;
        const price = Number.parseFloat(value);
        return Number.isFinite(price) && price >= 0 ? price : undefined;
    };
    const minPrice = parsePrice(minPriceParam);
    const maxPrice = parsePrice(maxPriceParam);
    let products: Awaited<ReturnType<typeof getProductsByBrand>>['results'] = [];
    let colors: Awaited<ReturnType<typeof getProductsByBrand>>['colors'] = [];
    let total = 0;
    let unavailable = false;
    try {
        ({ results: products, total, colors } = await getProductsByBrand(brand.key, {
            limit: PAGE_SIZE,
            offset: (page - 1) * PAGE_SIZE,
            sort,
            minPrice,
            maxPrice,
            color,
            locale: locale === 'de' ? 'de-DE' : 'en-US',
        }));
    } catch (error) {
        console.error('Failed to load brand products', {
            slug,
            ...getCommercetoolsErrorDetails(error),
        });
        unavailable = true;
    }

    const ratings = await Promise.all(products.map((product) => getProductRating(product.id)));
    const skus = products.flatMap((product) => [product.masterVariant, ...(product.variants ?? [])])
        .map((variant) => variant.sku).filter((sku): sku is string => Boolean(sku));
    const inventory = await getInventoryMapBySkus(skus);
    const productsWithInventory = products.map((product, index) => ({
        product,
        rating: ratings[index],
        availableQuantity: inventory[product.masterVariant.sku ?? ''] ?? 0,
    }));
    const activeFilters = [];
    if (minPrice !== undefined) {
        activeFilters.push({
            label: `${productTranslate('min')}: ${formatMarketPrice(minPrice, market)}`,
            key: 'minPrice',
        });
    }
    if (maxPrice !== undefined) {
        activeFilters.push({
            label: `${productTranslate('max')}: ${formatMarketPrice(maxPrice, market)}`,
            key: 'maxPrice',
        });
    }
    if (color) {
        activeFilters.push({ label: `${productTranslate('color')}: ${color}`, key: 'color' });
    }

    return (
        <section className="container mx-auto px-4 pb-10 pt-8">
            <header className="mb-8 flex flex-col items-center gap-4 rounded-lg border bg-white p-6 text-center sm:flex-row sm:text-left">
                <BrandLogo name={brand.name} logoUrl={brand.logoUrl} className="h-24 w-36 text-4xl" />
                <div>
                    <h1 className="text-3xl font-bold">{brand.name}</h1>
                    {brand.description && <p className="mt-2 text-gray-600">{brand.description}</p>}
                </div>
            </header>

            <h2 className="mb-6 text-2xl font-semibold">{translate('products')}</h2>
            <MobileFacets
                categories={[]}
                colors={colors}
                brands={brands}
                selectedBrandKey={brand.key}
                brandFilterMode="route"
            />
            <div className="flex flex-col gap-8 md:flex-row">
                <CategorySidebar
                    categories={[]}
                    colors={colors}
                    brands={brands}
                    selectedBrandKey={brand.key}
                    brandFilterMode="route"
                />
                <div className="min-w-0 flex-1">
                    {activeFilters.length > 0 && (
                        <div className="mb-6 flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium text-gray-700">{productTranslate('sortAndFilter')}:</span>
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
                    {unavailable ? (
                        <p role="status" className="rounded-lg border border-yellow-300 bg-yellow-50 px-6 py-8 text-center">{translate('unavailable')}</p>
                    ) : products.length === 0 ? (
                        <p className="rounded-lg border bg-white px-6 py-12 text-center text-gray-600">
                            {activeFilters.length > 0 ? translate('emptyFilteredProducts') : translate('emptyProducts')}
                        </p>
                    ) : (
                        <CategoryProductList
                            products={productsWithInventory}
                            total={total}
                            limit={PAGE_SIZE}
                            currentPage={page}
                        />
                    )}
                </div>
            </div>
        </section>
    );
}
