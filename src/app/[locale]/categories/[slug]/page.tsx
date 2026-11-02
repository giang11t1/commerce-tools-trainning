import { getCategoryColors, getCategories, getCategoryBySlug , getSubCategoriesByParentName} from '../../../../lib/categories';
import { getProductsByCategory } from '../../../../lib/products';
import { getBrands } from '@/lib/brands';
import { notFound } from 'next/navigation';
import CategorySidebar from '../../../../components/CategorySidebar';
import ActiveFilterItem from "@/components/ActiveFilterItem";
import ClearAllFiltersButton from "@/components/ClearAllFiltersButton";
import BannerCategory from "@/components/BannerCategory";
import CategoryProductList from "@/components/CategoryProductList";
import MobileFacets from '@/components/commercetools-ui/organisms/product/product-list/components/mobile-facets';
import {getProductRating} from "@/lib/reviews";
import {getInventoryMapBySkus} from "@/lib/inventory";
import { getTranslations } from 'next-intl/server';
import { formatMarketPrice, getCommerceMarket } from '@/lib/commerce-market';

interface CategoryPageProps {
    params: Promise<{ locale: string; slug: string }>;
    searchParams: Promise<{
        sort?: string;
        minPrice?: string;
        maxPrice?: string;
        color?: string;
        brand?: string;
        page?: string;
    }>;
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
    const translateError = await getTranslations('error');
    const translateProduct = await getTranslations('product');
    const { locale, slug } = await params;
    const market = getCommerceMarket(locale);
    const { sort, minPrice, maxPrice, color, brand: brandKeyParam, page } = await searchParams;
    const currentPage = parseInt(page || '1');
    const limit = 15;
    const offset = (currentPage - 1) * limit;

    const [category, categories, brands] = await Promise.all([
        getCategoryBySlug(slug),
        getCategories(),
        getBrands(),
    ]);

    if (!category) {
        notFound();
    }

    const subCategories = await getSubCategoriesByParentName(category.name['en-US']);

    const { colors, unavailable: colorsUnavailable } = await getCategoryColors(
        category.id,
        locale === 'de' ? 'de-DE' : 'en-US',
    );

    const categoryId = category.id;

    const min = minPrice ? parseFloat(minPrice) : undefined;
    const max = maxPrice ? parseFloat(maxPrice) : undefined;
    const selectedBrand = brands.find((brand) => brand.key === brandKeyParam);

    const productResult = brandKeyParam && !selectedBrand
        ? { results: [], total: 0, unavailable: false as const }
        : await getProductsByCategory(
            categoryId,
            sort,
            min,
            max,
            color,
            limit,
            offset,
            locale === 'de' ? 'de-DE' : 'en-US',
            selectedBrand?.key,
        );
    const { results: products, total, unavailable: productsUnavailable } = productResult;

    const productsWithRatings = await Promise.all(
        products.map(async (product) => ({
            product,
            rating: await getProductRating(product.id),
        })),
    );

    const activeFilters = [];
    if (min !== undefined && Number.isFinite(min)) {
        activeFilters.push({ label: `Min: ${formatMarketPrice(min, market)}`, key: 'minPrice' });
    }
    if (max !== undefined && Number.isFinite(max)) {
        activeFilters.push({ label: `Max: ${formatMarketPrice(max, market)}`, key: 'maxPrice' });
    }
    if (color) activeFilters.push({ label: `Color: ${color}`, key: 'color' });
    if (brandKeyParam) {
        activeFilters.push({
            label: `${translateProduct('brand')}: ${selectedBrand?.name ?? brandKeyParam}`,
            key: 'brand',
        });
    }

    const skus = products
        .map((product) => product.masterVariant.sku)
        .filter(Boolean) as string[];

    const inventoryMap =
        await getInventoryMapBySkus(skus);

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
        <div className="px-4 lg:py-8">
            <BannerCategory category={category} total={total} allCategories={categories} subCategories={subCategories}/>

            <hr  className="hidden xl:block my-16 border-t border-gray-300 w-screen  -ml-[22vw]"/>
            {colorsUnavailable && (
                <p className="mb-4 text-sm text-gray-600" role="status">
                    {translateError('category-colors-unavailable')}
                </p>
            )}
            <MobileFacets colors={colors} categories={categories} currentCategoryId={categoryId} brands={brands}/>
            <div className="flex flex-col md:flex-row gap-8">
                <CategorySidebar categories={categories} currentCategoryId={categoryId} colors={colors} brands={brands}/>

                <div className="flex-1">
                    {activeFilters.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 mb-6">
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

                    {productsUnavailable ? (
                        <div className="rounded-lg border border-yellow-300 bg-yellow-50 px-6 py-8 text-center" role="status">
                            <p className="text-gray-700">{translateError('product-search-unavailable')}</p>
                        </div>
                    ) : products.length === 0 ? (
                        <div className="text-center py-12 border rounded-lg bg-white">
                            <p className="text-gray-500">{translateProduct('noProductsFound')}</p>
                        </div>
                    ) : (
                        <>
                            <CategoryProductList
                                products={productsWithInventory}
                                total={total}
                                limit={limit}
                                currentPage={currentPage}
                            />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
