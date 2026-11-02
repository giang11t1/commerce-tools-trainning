'use server';

import { apiRoot } from './commercetools';
import type {
    ProductSearchFacetResultBucket,
    ProductSearchRequest,
} from '@commercetools/platform-sdk';

export async function getCategories() {
    const response = await apiRoot
        .withProjectKey({ projectKey: process.env.CT_PROJECT_KEY! })
        .categories()
        .get({
            queryArgs: {
                expand: ['parent'],
            },
        })
        .execute();

    return response.body.results;
}

export async function getCategoryById(id: string) {
    const response = await apiRoot
        .withProjectKey({ projectKey: process.env.CT_PROJECT_KEY! })
        .categories()
        .withId({ ID: id })
        .get()
        .execute();

    return response.body;
}

export async function getCategoryBySlug(
    slug: string,
    locales: string[] = ['en-US', 'de-DE'],
) {
    const where = locales
        .map((locale) => `slug(${locale}="${slug}")`)
        .join(' or ');

    const response = await apiRoot
        .withProjectKey({
            projectKey: process.env.CT_PROJECT_KEY!,
        })
        .categories()
        .get({
            queryArgs: {
                where,
            },
        })
        .execute();

    return response.body.results[0];
}

const COLOR_LABEL_FACET = 'category-color-labels';

function getApiErrorDetails(error: unknown) {
    const apiError = error as {
        statusCode?: number;
        body?: { errors?: { code?: string; message?: string }[] };
        message?: string;
    } | null;

    return {
        statusCode: apiError?.statusCode,
        errorCode: apiError?.body?.errors?.[0]?.code,
        errorMessage: apiError?.body?.errors?.[0]?.message || apiError?.message,
    };
}

function logCategorySearchError(endpoint: string, error: unknown) {
    const projectKey = process.env.CT_PROJECT_KEY!;
    console.error('Commercetools category Product Search request failed', {
        projectKey,
        method: endpoint === '/products/search' ? 'POST' : 'GET',
        endpoint: `/${projectKey}${endpoint}`,
        ...getApiErrorDetails(error),
    });
}

function getLocalizedColorName(value: unknown, locale: string): string {
    if (typeof value === 'string') {
        return value;
    }

    if (typeof value === 'object' && value !== null) {
        const localized = value as Record<string, string>;

        return (
            localized[locale] ||
            localized['en-US'] ||
            localized['en-GB'] ||
            localized['en'] ||
            Object.values(localized)[0] ||
            ''
        );
    }

    return '';
}

function getColorHex(value: unknown): string | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }

    const hex = value.trim();

    // #fff, #ffffff
    if (/^#[0-9a-fA-F]{3,8}$/.test(hex)) {
        return hex;
    }

    // Optional: support rgb()/rgba()
    if (/^rgba?\(/i.test(hex)) {
        return hex;
    }

    return undefined;
}

export async function getCategoryColors(categoryId: string, locale = 'en-US') {
    const limit = 500;
    let offset = 0;
    let total = 0;

    const hexByColor = new Map<string, string>();
    let facetTerms: string[] = [];
    const projectKey = process.env.CT_PROJECT_KEY!;
    let endpoint = '/products/search';

    try {
        const body: ProductSearchRequest = {
            query: { exact: { field: 'categories', value: categoryId } },
            facets: [{
                distinct: {
                    name: COLOR_LABEL_FACET,
                    field: 'variants.attributes.color-label',
                    fieldType: 'ltext',
                    language: locale,
                    limit: 100,
                },
            }],
            limit: 0,
        };
        const facetResponse = await apiRoot
            .withProjectKey({ projectKey })
            .products()
            .search()
            .post({ body })
            .execute();

        const facet = facetResponse.body.facets.find(
            (result): result is ProductSearchFacetResultBucket =>
                result.name === COLOR_LABEL_FACET && 'buckets' in result,
        );
        facetTerms = facet?.buckets.map((bucket) => bucket.key) ?? [];

        // The category-scoped projection query supplies swatch codes. Product
        // Search computes the values; this query only maps those values to UI data.
        do {
            endpoint = '/product-projections';
            const response = await apiRoot
                .withProjectKey({ projectKey })
                .productProjections()
                .get({
                    queryArgs: {
                        where: `categories(id="${categoryId}")`,
                        limit,
                        offset,
                    },
                })
                .execute();

            total = response.body.total ?? 0;
            response.body.results.forEach((product) => {
                [product.masterVariant, ...(product.variants ?? [])].forEach(
                    (variant) => {
                        const colorLabel = variant.attributes?.find(
                            (attribute) => attribute.name === 'color-label',
                        );
                        const colorCode = variant.attributes?.find(
                            (attribute) => attribute.name === 'color-code',
                        );
                        const name = getLocalizedColorName(colorLabel?.value, locale);
                        if (!name) return;

                        const hex = getColorHex(colorCode?.value);
                        if (
                            hex &&
                            (!hexByColor.has(name) ||
                                hexByColor.get(name) === '#CCCCCC')
                        ) {
                            hexByColor.set(name, hex);
                        }
                    },
                );
            });
            offset += limit;
        } while (offset < total);
    } catch (error) {
        logCategorySearchError(endpoint, error);
        return { colors: [], unavailable: true as const };
    }

    const colors = facetTerms
        .map((name) => {
            const hex = hexByColor.get(name);

            if (!hex) {
                return null;
            }

            return {
                name,
                value: name,
                hex,
            };
        })
        .filter(
            (color): color is {
                name: string;
                value: string;
                hex: string;
            } => color !== null,
        )
        .sort((a, b) => a.name.localeCompare(b.name));

    return { colors, unavailable: false as const };
}


export async function getSubCategoriesByParentName(
    parentName: string,
    locale = 'en-US',
) {
    const parentResponse = await apiRoot
        .withProjectKey({
            projectKey: process.env.CT_PROJECT_KEY!,
        })
        .categories()
        .get({
            queryArgs: {
                where: `name(${locale}="${parentName}")`,
                limit: 10,
            },
        })
        .execute();

    const parentCategory = parentResponse.body.results[0];

    if (!parentCategory) {
        return [];
    }

    const response = await apiRoot
        .withProjectKey({
            projectKey: process.env.CT_PROJECT_KEY!,
        })
        .categories()
        .get({
            queryArgs: {
                where: `parent(id="${parentCategory.id}")`,
                sort: ['orderHint asc'],
                limit: 500,
            },
        })
        .execute();

    return response.body.results;
}


