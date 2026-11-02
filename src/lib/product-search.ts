import 'server-only';

import type {
    ProductProjection,
    SearchSorting,
    _SearchQuery,
} from '@commercetools/platform-sdk';
import { apiRoot } from '@/lib/commercetools';
import { CHANNEL_KEYS, getChannelByKey } from '@/lib/channels';
import { getBrandProductProjectionPredicate } from '@/lib/category-product-search';
import { getCustomerForPricing } from '@/lib/customer';
import { getSession } from '@/lib/auth';
import { getCommerceMarket, toMinorAmount, type CommerceMarket } from '@/lib/commerce-market';

type SearchProductsOptions = {
    query: string;
    locale: string;
    limit?: number;
    offset?: number;
    minPrice?: number;
    maxPrice?: number;
    sort?: string;
    brandKey?: string;
};

function getApiErrorDetails(error: unknown) {
    const apiError = error as {
        statusCode?: number;
        body?: { errors?: { code?: string; message?: string }[] };
        message?: string;
    } | null;
    const apiErrorBody = apiError?.body?.errors?.[0];

    return {
        statusCode: apiError?.statusCode,
        errorCode: apiErrorBody?.code,
        errorMessage: apiErrorBody?.message ?? apiError?.message ?? 'Unknown commercetools error',
    };
}

function logSearchFailure(
    error: unknown,
    projectKey: string,
    endpoint: string,
) {
    const details = getApiErrorDetails(error);
    console.error('commercetools product search request failed', {
        projectKey,
        method: endpoint.endsWith('/products/search') ? 'POST' : 'GET',
        endpoint,
        statusCode: details.statusCode,
        errorCode: details.errorCode,
        errorMessage: details.errorMessage,
    });
}

function getSort(
    sort: string | undefined,
    locale: string,
    market: CommerceMarket,
    priceChannelId?: string,
    priceCustomerGroupId?: string,
): SearchSorting[] | undefined {
    const priceScope = {
        and: [
            { exact: { field: 'variants.prices.currencyCode', value: market.currency } },
            { exact: { field: 'variants.prices.country', value: market.country } },
            ...(priceChannelId
                ? [{ exact: { field: 'variants.prices.channel', value: priceChannelId } }]
                : []),
            ...(priceCustomerGroupId
                ? [{ exact: { field: 'variants.prices.customerGroup', value: priceCustomerGroupId } }]
                : []),
        ],
    } satisfies _SearchQuery;

    switch (sort) {
        case 'price-asc':
            return [{ field: 'variants.prices.centAmount', filter: priceScope, mode: 'min', order: 'asc' }];
        case 'price-desc':
            return [{ field: 'variants.prices.centAmount', filter: priceScope, mode: 'max', order: 'desc' }];
        case 'name-asc':
            return [
                { field: 'name', language: locale, order: 'asc' },
                { field: 'id', order: 'asc' },
            ];
        case 'name-desc':
            return [
                { field: 'name', language: locale, order: 'desc' },
                { field: 'id', order: 'asc' },
            ];
        case 'newest':
            return [
                { field: 'createdAt', order: 'desc' },
                { field: 'id', order: 'asc' },
            ];
        default:
            return undefined;
    }
}

export async function searchProducts({
    query,
    locale,
    limit = 15,
    offset = 0,
    minPrice,
    maxPrice,
    sort,
    brandKey,
}: SearchProductsOptions): Promise<{ results: ProductProjection[]; total: number }> {
    const projectKey = process.env.CT_PROJECT_KEY;
    if (!projectKey) throw new Error('Missing CT_PROJECT_KEY');

    const normalizedQuery = query.trim();
    if (!normalizedQuery) return { results: [], total: 0 };
    const market = getCommerceMarket(locale);

    const safeLimit = Math.min(100, Math.max(1, Math.floor(limit)));
    const safeOffset = Math.min(10_000, Math.max(0, Math.floor(offset)));
    const customerId = await getSession();
    const customer = customerId ? await getCustomerForPricing(customerId) : null;
    let priceChannelId =
        customer?.custom?.fields?.priceChannelId as string | undefined;
    if (!priceChannelId) {
        try {
            priceChannelId = (await getChannelByKey(CHANNEL_KEYS.distribution)).id;
        } catch {
            // Search remains available when the optional distribution channel is not configured.
        }
    }
    const priceCustomerGroupId = customer?.customerGroup?.id;

    const textQuery: _SearchQuery = {
        or: ['name', 'description', 'slug', 'searchKeywords'].map((field) => ({
            fullText: { field, language: locale, value: normalizedQuery },
        })),
    };
    const priceFilters: _SearchQuery[] = [];
    if (minPrice !== undefined || maxPrice !== undefined) {
        priceFilters.push(
            { exact: { field: 'variants.prices.currencyCode', value: market.currency } },
            { exact: { field: 'variants.prices.country', value: market.country } },
        );
        if (priceChannelId) {
            priceFilters.push({ exact: { field: 'variants.prices.channel', value: priceChannelId } });
        }
        if (priceCustomerGroupId) {
            priceFilters.push({
                exact: { field: 'variants.prices.customerGroup', value: priceCustomerGroupId },
            });
        }
        priceFilters.push({
            range: {
                field: 'variants.prices.currentCentAmount',
                ...(minPrice !== undefined && { gte: toMinorAmount(minPrice, market) }),
                ...(maxPrice !== undefined && { lte: toMinorAmount(maxPrice, market) }),
            },
        });
    }

    const searchQuery: _SearchQuery = priceFilters.length
        ? { and: [textQuery, ...priceFilters] }
        : textQuery;
    const sortOptions = getSort(
        sort,
        locale,
        market,
        priceChannelId,
        priceCustomerGroupId,
    );
    const searchEndpoint = `/${projectKey}/products/search`;

    const executeSearch = async (limit: number, offset: number) => {
        try {
            return await apiRoot
                .withProjectKey({ projectKey })
                .products()
                .search()
                .post({
                    body: {
                        query: searchQuery,
                        ...(sortOptions && { sort: sortOptions }),
                        limit,
                        offset,
                    },
                })
                .execute();
        } catch (error) {
            logSearchFailure(error, projectKey, searchEndpoint);
            throw error;
        }
    };

    if (brandKey) {
        const searchIds: string[] = [];
        let searchTotal = 0;
        let searchOffset = 0;
        const searchBatchSize = 100;

        do {
            const response = await executeSearch(searchBatchSize, searchOffset);
            searchTotal = response.body.total;
            searchIds.push(...response.body.results.map((result) => result.id));
            searchOffset += response.body.results.length;
            if (!response.body.results.length) break;
        } while (searchOffset < searchTotal);

        const projectionsById = new Map<string, ProductProjection>();
        const projectionPredicate = getBrandProductProjectionPredicate(brandKey);
        const projectionBatchSize = 100;

        for (let index = 0; index < searchIds.length; index += projectionBatchSize) {
            const ids = searchIds.slice(index, index + projectionBatchSize);
            const projectionEndpoint = `/${projectKey}/product-projections`;
            try {
                const projections = await apiRoot
                    .withProjectKey({ projectKey })
                    .productProjections()
                    .get({
                        queryArgs: {
                            where: `id in (${ids.map((id) => JSON.stringify(id)).join(',')}) and ${projectionPredicate}`,
                            limit: ids.length,
                            priceCurrency: market.currency,
                            priceCountry: market.country,
                            ...(priceChannelId && { priceChannel: priceChannelId }),
                            ...(priceCustomerGroupId && {
                                priceCustomerGroup: priceCustomerGroupId,
                            }),
                        },
                    })
                    .execute();
                projections.body.results.forEach((product) => projectionsById.set(product.id, product));
            } catch (error) {
                logSearchFailure(error, projectKey, projectionEndpoint);
                throw error;
            }
        }

        const matchingProducts = searchIds
            .map((id) => projectionsById.get(id))
            .filter((product): product is ProductProjection => product !== undefined);

        return {
            results: matchingProducts.slice(safeOffset, safeOffset + safeLimit),
            total: matchingProducts.length,
        };
    }

    const searchResponse = await executeSearch(safeLimit, safeOffset);

    const productIds = searchResponse.body.results.map((result) => result.id);
    if (!productIds.length) {
        return { results: [], total: searchResponse.body.total };
    }

    const projectionEndpoint = `/${projectKey}/product-projections`;
    try {
        const projections = await apiRoot
            .withProjectKey({ projectKey })
            .productProjections()
            .get({
                queryArgs: {
                    where: `id in (${productIds.map((id) => JSON.stringify(id)).join(',')})`,
                    limit: productIds.length,
                    priceCurrency: market.currency,
                    priceCountry: market.country,
                    ...(priceChannelId && { priceChannel: priceChannelId }),
                    ...(priceCustomerGroupId && {
                        priceCustomerGroup: priceCustomerGroupId,
                    }),
                },
            })
            .execute();
        const projectionsById = new Map(projections.body.results.map((product) => [product.id, product]));

        return {
            results: productIds
                .map((id) => projectionsById.get(id))
                .filter((product): product is ProductProjection => product !== undefined),
            total: searchResponse.body.total,
        };
    } catch (error) {
        logSearchFailure(error, projectKey, projectionEndpoint);
        throw error;
    }
}
