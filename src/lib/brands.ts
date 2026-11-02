import 'server-only';

import type { ProductProjection } from '@commercetools/platform-sdk';
import { apiRoot } from '@/lib/commercetools';
import { getCustomerForPricing } from '@/lib/customer';
import { getSession } from '@/lib/auth';
import { CHANNEL_KEYS, getChannelByKey } from '@/lib/channels';
import { getCommerceMarket, toMinorAmount } from '@/lib/commerce-market';
import {
    getBrandProductProjectionPredicate,
    getCommercetoolsErrorDetails,
} from '@/lib/category-product-search';

export type Brand = {
    key: string;
    name: string;
    slug: string;
    logoUrl?: string;
    description?: string;
    isActive: boolean;
    sortOrder: number;
};

type BrandCustomObject = {
    key: string;
    value?: Record<string, unknown>;
};

function isActiveBrand(brand: Brand | null): brand is Brand {
    return brand !== null && brand.isActive;
}

function toBrand(record: BrandCustomObject): Brand | null {
    const value = record.value;
    if (!value || typeof value.name !== 'string' || typeof value.slug !== 'string') {
        console.warn('Skipping invalid brand Custom Object', { key: record.key });
        return null;
    }

    return {
        key: record.key,
        name: value.name,
        slug: value.slug,
        logoUrl: typeof value.logoUrl === 'string' ? value.logoUrl : undefined,
        description: typeof value.description === 'string' ? value.description : undefined,
        isActive: value.isActive !== false,
        sortOrder: typeof value.sortOrder === 'number' ? value.sortOrder : 0,
    };
}

export async function getBrands(): Promise<Brand[]> {
    const projectKey = process.env.CT_PROJECT_KEY;
    if (!projectKey) throw new Error('Missing CT_PROJECT_KEY');

    const limit = 500;
    let offset = 0;
    let total = 0;
    const brands: Brand[] = [];

    do {
        const response = await apiRoot
            .withProjectKey({ projectKey })
            .customObjects()
            .get({ queryArgs: { container: 'brands', limit, offset } })
            .execute();
        total = response.body.total ?? brands.length + response.body.results.length;
        brands.push(...response.body.results
            .map((record) => toBrand(record as BrandCustomObject))
            .filter((brand): brand is Brand => brand !== null && brand.isActive));
        offset += response.body.count;
        if (!response.body.count) break;
    } while (offset < total);

    return brands.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

export async function getBrandBySlug(slug: string): Promise<Brand | null> {
    const brands = await getBrands();
    return brands.find((brand) => brand.slug === slug) ?? null;
}

export async function getBrandByKey(key: string): Promise<Brand | null> {
    const projectKey = process.env.CT_PROJECT_KEY;
    if (!projectKey || !key) return null;

    const response = await apiRoot
        .withProjectKey({ projectKey })
        .customObjects()
        .withContainerAndKey({ container: 'brands', key })
        .get()
        .execute();

    const brand = toBrand(response.body as BrandCustomObject);
    return isActiveBrand(brand) ? brand : null;
}

export function getProductBrandKey(product: ProductProjection): string | null {
    const productValue = product.attributes?.find((attribute) => attribute.name === 'brand')?.value;
    if (Array.isArray(productValue)) {
        const key = productValue.find((value) =>
            typeof value === 'object' && value !== null && 'key' in value && typeof value.key === 'string'
        );
        if (key && typeof key === 'object' && 'key' in key && typeof key.key === 'string') {
            return key.key;
        }
    } else if (typeof productValue === 'string') {
        return productValue;
    } else if (typeof productValue === 'object' && productValue !== null && 'key' in productValue && typeof productValue.key === 'string') {
        return productValue.key;
    }

    const variants = [product.masterVariant, ...(product.variants ?? [])];

    for (const variant of variants) {
        const value = variant.attributes?.find((attribute) => attribute.name === 'brand')?.value;
        if (typeof value === 'string') return value;
        if (typeof value === 'object' && value !== null && 'key' in value && typeof value.key === 'string') {
            return value.key;
        }
    }

    return null;
}

export async function getProductsByBrand(
    brandKey: string,
    options: {
        limit?: number;
        offset?: number;
        sort?: string;
        minPrice?: number;
        maxPrice?: number;
        color?: string;
        locale?: string;
    } = {},
): Promise<{
    results: ProductProjection[];
    total: number;
    colors: { name: string; value: string; hex: string }[];
}> {
    const {
        limit = 15,
        offset = 0,
        sort = 'newest',
        minPrice,
        maxPrice,
        color,
        locale = 'en-US',
    } = options;
    const market = getCommerceMarket(locale);
    const safeLimit = Math.min(50, Math.max(1, Math.floor(limit)));
    const safeOffset = Math.max(0, Math.floor(offset));
    const where = getBrandProductProjectionPredicate(brandKey);
    const customerId = await getSession();
    const customer = customerId ? await getCustomerForPricing(customerId) : null;
    let priceChannelId = customer?.custom?.fields?.priceChannelId as string | undefined;
    if (!priceChannelId) {
        try {
            priceChannelId = (await getChannelByKey(CHANNEL_KEYS.distribution)).id;
        } catch {
            // Keep the listing available if the project's default price channel is not configured.
        }
    }
    const queryArgs: {
        where: string;
        limit: number;
        offset: number;
        priceCurrency: string;
        priceCountry: string;
        priceChannel?: string;
        priceCustomerGroup?: string;
    } = {
        where,
        limit: safeLimit,
        offset: safeOffset,
        priceCurrency: market.currency,
        priceCountry: market.country,
    };
    if (priceChannelId) queryArgs.priceChannel = priceChannelId;
    if (customer?.customerGroup?.id) queryArgs.priceCustomerGroup = customer.customerGroup.id;

    const allProducts: ProductProjection[] = [];
    let total = 0;
    let productOffset = 0;
    const fetchLimit = 500;
    const projectKey = process.env.CT_PROJECT_KEY!;
    do {
        let response;
        try {
            response = await apiRoot
                .withProjectKey({ projectKey })
                .productProjections()
                .get({
                    queryArgs: { ...queryArgs, limit: fetchLimit, offset: productOffset },
                })
                .execute();
        } catch (error) {
            const details = getCommercetoolsErrorDetails(error);
            console.error('Commercetools brand product request failed', {
                method: 'GET',
                endpoint: `/${projectKey}/product-projections`,
                statusCode: details.statusCode,
                errorCode: details.errorCode,
                errorMessage: details.errorMessage,
            });
            throw error;
        }

        allProducts.push(...response.body.results);
        total = response.body.total ?? allProducts.length;
        productOffset += response.body.count;
        if (!response.body.count) break;
    } while (productOffset < total);

    const colorHexByName = new Map<string, string>();
    allProducts.forEach((product) => {
        [product.masterVariant, ...(product.variants ?? [])].forEach((variant) => {
            const labelValue = variant.attributes?.find(
                (item) => item.name === 'color-label',
            )?.value;
            const colorName =
                typeof labelValue === 'string'
                    ? labelValue
                    : typeof labelValue === 'object' && labelValue !== null
                      ? (labelValue as Record<string, string>)[locale] ??
                        (labelValue as Record<string, string>)['en-US'] ??
                        Object.values(labelValue as Record<string, string>)[0]
                      : undefined;
            if (!colorName) return;

            const colorCode = variant.attributes?.find(
                (item) => item.name === 'color-code',
            )?.value;
            const hex =
                typeof colorCode === 'string' &&
                (/^#[0-9a-fA-F]{3,8}$/.test(colorCode.trim()) ||
                    /^rgba?\(/i.test(colorCode.trim()))
                    ? colorCode.trim()
                    : '#CCCCCC';
            const currentHex = colorHexByName.get(colorName);
            if (!currentHex || currentHex === '#CCCCCC') {
                colorHexByName.set(colorName, hex);
            }
        });
    });

    const colors = [...colorHexByName].map(([name, hex]) => ({
        name,
        value: name,
        hex,
    })).sort((a, b) => a.name.localeCompare(b.name, locale));

    // Apply filters before slicing so the result count and pagination stay accurate.
    let filteredProducts = allProducts.filter((product) => {
        const variants = [product.masterVariant, ...(product.variants ?? [])];
        if (color && !variants.some((variant) => {
            const label = variant.attributes?.find(
                (item) => item.name === 'color-label',
            )?.value;
            const localizedLabel =
                typeof label === 'string'
                    ? label
                    : typeof label === 'object' && label !== null
                      ? (label as Record<string, string>)[locale] ??
                        (label as Record<string, string>)['en-US'] ??
                        Object.values(label as Record<string, string>)[0]
                      : undefined;
            return localizedLabel === color;
        })) {
            return false;
        }

        if (minPrice !== undefined || maxPrice !== undefined) {
            return variants.some((variant) => {
                const price = variant.price?.discounted?.value.centAmount ??
                    variant.price?.value.centAmount;
                return price !== undefined &&
                    (minPrice === undefined || price >= toMinorAmount(minPrice, market)) &&
                    (maxPrice === undefined || price <= toMinorAmount(maxPrice, market));
            });
        }

        return true;
    });

    const getName = (product: ProductProjection) =>
        product.name[locale as keyof typeof product.name] ??
        product.name['en-US'] ??
        Object.values(product.name)[0] ??
        '';
    if (sort === 'name-asc') {
        filteredProducts = filteredProducts.sort((a, b) => getName(a).localeCompare(getName(b), locale));
    } else if (sort === 'name-desc') {
        filteredProducts = filteredProducts.sort((a, b) => getName(b).localeCompare(getName(a), locale));
    } else {
        filteredProducts = filteredProducts.sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
    }

    return {
        results: filteredProducts.slice(safeOffset, safeOffset + safeLimit),
        total: filteredProducts.length,
        colors,
    };
}
