'use server';

import { apiRoot } from './commercetools';
import {ProductProjection} from "@commercetools/platform-sdk";
import type { ProductSearchRequest } from '@commercetools/platform-sdk';
import { getCustomerById, getCustomerForPricing } from './customer';
import { getSession } from './auth';
import { getChannelByKey, CHANNEL_KEYS } from './channels';
import { getCommerceMarket, toMinorAmount } from './commerce-market';
import { getInventoryMapBySkus } from './inventory';
import { getProductRating } from './reviews';
import { isProductAvailableInCustomerStore } from './cart';
import {
    combineProductSearchExpressions,
    executeCategoryProductSearch,
    getBrandProductProjectionPredicate,
    getCommercetoolsErrorDetails,
} from './category-product-search';

async function getPriceChannelId(customerChannelId?: string): Promise<string | undefined> {
    if (customerChannelId) return customerChannelId;
    try {
        const channel = await getChannelByKey(CHANNEL_KEYS.distribution);
        return channel.id;
    } catch {
        return undefined;
    }
}

export async function getProducts(locale = 'en-US') {
    const market = getCommerceMarket(locale);
    const customerId = await getSession();
    const customer = customerId ? await getCustomerForPricing(customerId) : null;
    const priceChannelId = await getPriceChannelId(
        customer?.custom?.fields?.priceChannelId as string | undefined,
    );

    const queryArgs: any = {
        priceCurrency: market.currency,
        priceCountry: market.country,
    };

    if (customer?.customerGroup?.id) {
        queryArgs.priceCustomerGroup = customer.customerGroup.id;
    }

    if (priceChannelId) {
        queryArgs.priceChannel = priceChannelId;
    }

    const response = await apiRoot
        .withProjectKey({
            projectKey: process.env.CT_PROJECT_KEY!,
        })
        .productProjections()
        .get({ queryArgs })
        .execute();

    return response.body.results;
}

export async function getProductBySlug(slug: string, locale = 'en-US') {
    const market = getCommerceMarket(locale);
    const customerId = await getSession();

    let customerGroupId: string | undefined;
    let customerPriceChannelId: string | undefined;

    if (customerId) {
        const customer = await getCustomerForPricing(customerId);

        customerGroupId = customer?.customerGroup?.id;
        customerPriceChannelId = customer?.custom?.fields?.priceChannelId as string | undefined;
    }

    const priceChannelId = await getPriceChannelId(customerPriceChannelId);

    const queryArgs: any = {
        where: `slug(${market.locale}="${slug}")`,
        expand: [
            'categories[*]',
        ],
        limit: 1,
        priceCurrency: market.currency,
        priceCountry: market.country,
    };

    if (customerGroupId) {
        queryArgs.priceCustomerGroup = customerGroupId;
    }

    if (priceChannelId) {
        queryArgs.priceChannel = priceChannelId;
    }

    const response = await apiRoot
        .withProjectKey({
            projectKey: process.env.CT_PROJECT_KEY!,
        })
        .productProjections()
        .get({
            queryArgs,
        })
        .execute();

    return response.body.results[0] ?? null;
}

export async function getProductsByCategory(
    categoryId: string,
    sort?: string,
    minPrice?: number,
    maxPrice?: number,
    color?: string,
    limit: number = 20,
    offset: number = 0,
    locale = 'en-US',
    brandKey?: string,
) {
    const market = getCommerceMarket(locale);
    const customerId = await getSession();

    let customerGroupId: string | undefined;
    let customerPriceChannelId: string | undefined;

    if (customerId) {
        const customer = await getCustomerForPricing(customerId);

        customerGroupId = customer?.customerGroup?.id;
        customerPriceChannelId = customer?.custom?.fields?.priceChannelId as string | undefined;
    }

    const priceChannelId = await getPriceChannelId(customerPriceChannelId);

    const projectKey = process.env.CT_PROJECT_KEY!;
    let endpoint = '/products/search';
    let method: 'GET' | 'POST' = 'POST';
    let requestDetails: {
        body?: ProductSearchRequest;
        queryArgs?: Record<string, string | number | string[]>;
    } = {};
    try {
        if (brandKey) {
            endpoint = '/product-projections';
            method = 'GET';

            const queryArgs: Record<string, string | number | string[]> = {
                where: `categories(id=${JSON.stringify(categoryId)}) and ${getBrandProductProjectionPredicate(brandKey)}`,
                limit: 500,
                priceCurrency: market.currency,
                priceCountry: market.country,
            };
            if (customerGroupId) queryArgs.priceCustomerGroup = customerGroupId;
            if (priceChannelId) queryArgs.priceChannel = priceChannelId;

            const matchingProducts: ProductProjection[] = [];
            let productOffset = 0;
            let productTotal = 0;
            do {
                const pageQueryArgs = { ...queryArgs, offset: productOffset };
                requestDetails = { queryArgs: pageQueryArgs };
                const response = await apiRoot
                    .withProjectKey({ projectKey })
                    .productProjections()
                    .get({ queryArgs: pageQueryArgs })
                    .execute();
                matchingProducts.push(...response.body.results);
                productTotal = response.body.total ?? matchingProducts.length;
                productOffset += response.body.count;
                if (!response.body.count) break;
            } while (productOffset < productTotal);

            const getLocalizedText = (value: unknown): string | undefined => {
                if (typeof value === 'string') return value;
                if (typeof value !== 'object' || value === null) return undefined;
                const localizedValue = value as Record<string, unknown>;
                const text = localizedValue[locale] ?? localizedValue['en-US'] ?? Object.values(localizedValue)[0];
                return typeof text === 'string' ? text : undefined;
            };
            let filteredProducts = matchingProducts.filter((product) => {
                const variants = [product.masterVariant, ...(product.variants ?? [])];
                if (color && !variants.some((variant) => {
                    const value = variant.attributes?.find((attribute) => attribute.name === 'color-label')?.value;
                    return getLocalizedText(value) === color;
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
            const getPrice = (product: ProductProjection) => {
                const prices = [product.masterVariant, ...(product.variants ?? [])]
                    .map((variant) => variant.price?.discounted?.value.centAmount ?? variant.price?.value.centAmount)
                    .filter((price): price is number => price !== undefined);
                if (!prices.length) return undefined;
                return prices.reduce((best, price) =>
                    sort === 'price-desc' ? Math.max(best, price) : Math.min(best, price),
                );
            };
            if (sort === 'name-asc') {
                filteredProducts = filteredProducts.sort((a, b) => getName(a).localeCompare(getName(b), locale));
            } else if (sort === 'name-desc') {
                filteredProducts = filteredProducts.sort((a, b) => getName(b).localeCompare(getName(a), locale));
            } else if (sort === 'price-asc' || sort === 'price-desc') {
                filteredProducts = filteredProducts.sort((a, b) => {
                    const aPrice = getPrice(a);
                    const bPrice = getPrice(b);
                    if (aPrice === undefined) return bPrice === undefined ? 0 : 1;
                    if (bPrice === undefined) return -1;
                    return sort === 'price-asc' ? aPrice - bPrice : bPrice - aPrice;
                });
            } else {
                filteredProducts = filteredProducts.sort((a, b) =>
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
                );
            }

            const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 100);
            const safeOffset = Math.max(0, Math.floor(offset));
            return {
                results: filteredProducts.slice(safeOffset, safeOffset + safeLimit),
                total: filteredProducts.length,
                unavailable: false as const,
            };
        }

        const productFilters: NonNullable<ProductSearchRequest['query']>[] = [
            { exact: { field: 'categories', value: categoryId } },
        ];
        if (color) {
            productFilters.push({
                exact: {
                    field: 'variants.attributes.color-label',
                    fieldType: 'ltext',
                    language: locale,
                    value: color,
                },
            });
        }
        const priceScope: NonNullable<ProductSearchRequest['query']>[] = [
            { exact: { field: 'variants.prices.currencyCode', value: market.currency } },
            { exact: { field: 'variants.prices.country', value: market.country } },
        ];
        if (customerGroupId) {
            priceScope.push({
                exact: { field: 'variants.prices.customerGroup', value: customerGroupId },
            });
        }
        if (priceChannelId) {
            priceScope.push({
                exact: { field: 'variants.prices.channel', value: priceChannelId },
            });
        }

        const queryParts: NonNullable<ProductSearchRequest['query']>[] = [
            combineProductSearchExpressions(productFilters),
        ];
        if (minPrice !== undefined || maxPrice !== undefined) {
            queryParts.push(
                combineProductSearchExpressions([
                    ...priceScope,
                    {
                        range: {
                            field: 'variants.prices.currentCentAmount',
                            ...(minPrice !== undefined && { gte: toMinorAmount(minPrice, market) }),
                            ...(maxPrice !== undefined && { lte: toMinorAmount(maxPrice, market) }),
                        },
                    },
                ]),
            );
        }

        const sortConfig = (() => {
            switch (sort) {
                case 'name-asc':
                    return [{ field: 'name', language: market.locale, order: 'asc' as const }];
                case 'name-desc':
                    return [{ field: 'name', language: market.locale, order: 'desc' as const }];
                case 'price-asc':
                case 'price-desc':
                    return [{
                        field: 'variants.prices.currentCentAmount',
                        filter: { and: priceScope },
                        order: sort === 'price-asc' ? 'asc' as const : 'desc' as const,
                        mode: sort === 'price-asc' ? 'min' as const : 'max' as const,
                    }];
                case 'newest':
                    return [{ field: 'createdAt', order: 'desc' as const }];
                default:
                    return undefined;
            }
        })();
        const body: ProductSearchRequest = {
            query: combineProductSearchExpressions(queryParts),
            ...(sortConfig && { sort: sortConfig }),
            limit: Math.min(Math.max(limit, 0), 100),
            offset,
        };
        requestDetails = { body };

        const searchResult = await executeCategoryProductSearch(() =>
            apiRoot
                .withProjectKey({ projectKey })
                .products()
                .search()
                .post({ body })
                .execute(),
        );
        if (!searchResult.ok) {
            throw searchResult.error;
        }
        const response = searchResult.value;

        const ids = response.body.results.map((result) => result.id);
        if (ids.length === 0) {
            return {
                results: [],
                total: response.body.total,
                unavailable: false as const,
            };
        }

        const projectionQueryArgs: Record<string, string | number | string[]> = {
            where: `id in (${ids.map((id) => `"${id}"`).join(',')})`,
            expand: ['categories[*]', 'taxCategory'],
            limit: ids.length,
            priceCurrency: market.currency,
            priceCountry: market.country,
        };
        if (customerGroupId) projectionQueryArgs.priceCustomerGroup = customerGroupId;
        if (priceChannelId) projectionQueryArgs.priceChannel = priceChannelId;

        endpoint = '/product-projections';
        method = 'GET';
        requestDetails = { queryArgs: projectionQueryArgs };
        const projections = await apiRoot
            .withProjectKey({ projectKey })
            .productProjections()
            .get({ queryArgs: projectionQueryArgs })
            .execute();
        const projectionById = new Map(
            projections.body.results.map((product) => [product.id, product]),
        );

        return {
            results: ids.flatMap((id) => {
                const product = projectionById.get(id);
                return product ? [product] : [];
            }),
            total: response.body.total,
            unavailable: false as const,
        };
    } catch (error) {
        const errorDetails = getCommercetoolsErrorDetails(error);
        console.error(
            `Commercetools category product request failed ${JSON.stringify({
                method,
                endpoint: `/${projectKey}${endpoint}`,
                request: requestDetails,
                ...errorDetails,
            })}`,
        );

        return {
            results: [],
            total: 0,
            unavailable: true as const,
        };
    }
}


export async function getRelatedProducts(
    product: ProductProjection,
    locale = 'en-US',
) {
    const market = getCommerceMarket(locale);
    const relatedProducts =
        product.attributes?.find(
            (attr) => attr.name === 'relatedProducts',
        )?.value as Array<{ id: string }> | undefined;


    if (!relatedProducts?.length) {
        return [];
    }

    const where = relatedProducts
        .map(({ id }) => `id = "${id}"`)
        .join(' or ');
    const customerId = await getSession();
    const customer = customerId ? await getCustomerForPricing(customerId) : null;
    const priceChannelId = await getPriceChannelId(
        customer?.custom?.fields?.priceChannelId as string | undefined,
    );
    const queryArgs: any = {
        where,
        limit: relatedProducts.length,
        priceCurrency: market.currency,
        priceCountry: market.country,
    };
    if (customer?.customerGroup?.id) {
        queryArgs.priceCustomerGroup = customer.customerGroup.id;
    }
    if (priceChannelId) {
        queryArgs.priceChannel = priceChannelId;
    }

    const response = await apiRoot
        .withProjectKey({
            projectKey: process.env.CT_PROJECT_KEY!,
        })
        .productProjections()
        .get({
            queryArgs,
        })
        .execute();

    return response.body.results;
}



/**
 * Products sharing a category with any of the given ones.
 *
 * Uses a `where` predicate: the query endpoint silently ignores `filter`
 * (search-only), which returned the same first 8 products for every cart.
 * Product Projection Search is deactivated for this project.
 * Price selection is required so `masterVariant.price` is set, otherwise
 * AddToCartButton cannot add the product.
 */
export async function getRelatedProductsCart(
    categoryIds: string[],
    excludeProductIds: string[] = [],
    locale = 'en-US',
) {
    const market = getCommerceMarket(locale);
    if (!categoryIds.length) {
        return [];
    }

    const customerId = await getSession();
    const customer = customerId ? await getCustomerForPricing(customerId) : null;
    const priceChannelId = await getPriceChannelId(
        customer?.custom?.fields?.priceChannelId as string | undefined
    );

    const toList = (ids: string[]) => ids.map((id) => JSON.stringify(id)).join(',');
    const where = [`categories(id in (${toList(categoryIds)}))`];

    if (excludeProductIds.length) {
        where.push(`id not in (${toList(excludeProductIds)})`);
    }

    const queryArgs: any = {
        where: where.join(' and '),
        limit: 8,
        priceCurrency: market.currency,
        priceCountry: market.country,
    };

    if (customer?.customerGroup?.id) {
        queryArgs.priceCustomerGroup = customer.customerGroup.id;
    }

    if (priceChannelId) {
        queryArgs.priceChannel = priceChannelId;
    }

    const response = await apiRoot
        .withProjectKey({
            projectKey: process.env.CT_PROJECT_KEY!,
        })
        .productProjections()
        .get({ queryArgs })
        .execute();

    return response.body.results;
}

/** Related products for the cart page, based on the cart products' categories. */
export async function getRelatedProductsForCartItems(
    productIds: string[],
    locale = 'en-US',
) {
    const cartProducts = await getProductsByIds([...new Set(productIds)]);
    const categoryIds = [
        ...new Set(cartProducts.flatMap((product) => product.categories.map((category) => category.id))),
    ];

    return getRelatedProductsCart(categoryIds, productIds, locale);
}


// wishlist products
export async function getWishlistProducts(
    customerId: string,
    locale = 'en-US',
) {
    const market = getCommerceMarket(locale);
    const customer = await getCustomerById(customerId);
    const priceChannelId = await getPriceChannelId(
        customer?.custom?.fields?.priceChannelId as string | undefined
    );
    const response =
        await apiRoot
            .withProjectKey({
                projectKey: process.env.CT_PROJECT_KEY!,
            })
            .shoppingLists()
            .get({
                queryArgs: {
                    where: `customer(id="${customerId}")`,
                    limit: 100,
                },
            })
            .execute();

    const shoppingLists = response.body.results;

    if (!shoppingLists.length) {
        return [];
    }

    const productIds = [
        ...new Set(
            shoppingLists.flatMap((list) => [
                ...list.lineItems.map((lineItem) => lineItem.productId),
                ...(list.textLineItems ?? [])
                    .map((item) => item.key)
                    .filter((key): key is string =>
                        !!key?.startsWith('wishlist-product-')
                    )
                    .map((key) => key.slice('wishlist-product-'.length)),
            ]),
        ),
    ];

    if (!productIds.length) {
        return shoppingLists.map((list) => ({
            id: list.id,
            name:
                list.name.en ??
                Object.values(list.name)[0] ??
                'Wishlist',
            products: [],
        }));
    }

    const productQueryArgs: any = {
        where: productIds
            .map((id) => `id="${id}"`)
            .join(' or '),
        limit: productIds.length,
        priceCurrency: market.currency,
        priceCountry: market.country,
    };

    if (priceChannelId) {
        productQueryArgs.priceChannel = priceChannelId;
    }
    if (customer?.customerGroup?.id) {
        productQueryArgs.priceCustomerGroup = customer.customerGroup.id;
    }

    const productsResponse =
        await apiRoot
            .withProjectKey({
                projectKey: process.env.CT_PROJECT_KEY!,
            })
            .productProjections()
            .get({
                queryArgs: productQueryArgs,
            })
            .execute();

    const products =
        productsResponse.body.results;

    const productMap = new Map(
        products.map((product) => [
            product.id,
            product,
        ]),
    );

    return shoppingLists.map((list) => ({
        id: list.id,

        // LocalizedString -> string
        name:
            list.name.en ??
            Object.values(list.name)[0] ??
            'Wishlist',

        products: [
            ...list.lineItems.map((lineItem) => lineItem.productId),
            ...(list.textLineItems ?? [])
                .map((item) => item.key)
                .filter((key): key is string =>
                    !!key?.startsWith('wishlist-product-')
                )
                .map((key) => key.slice('wishlist-product-'.length)),
        ]
            .map((productId) => productMap.get(productId))
            .filter(
                (
                    product,
                ): product is ProductProjection =>
                    Boolean(product),
            ),
    }));
}


export async function getProductsByIds(
    productIds: string[]
): Promise<ProductProjection[]> {
    if (!productIds.length) {
        return [];
    }

    const response = await apiRoot
        .withProjectKey({
            projectKey: process.env.CT_PROJECT_KEY!,
        })
        .productProjections()
        .get({
            queryArgs: {
                where: `id in (${productIds
                    .map((id) => `"${id}"`)
                    .join(',')})`,
                limit: productIds.length,
            },
        })
        .execute();

    return response.body.results;
}

export async function getCompareProducts(
    productIds: string[],
    locale = 'en-US',
) {
    const ids = [...new Set(productIds)]
        .filter((id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
        .slice(0, 10);
    if (ids.length === 0) return [];

    const market = getCommerceMarket(locale);
    const customerId = await getSession();
    const customer = customerId ? await getCustomerForPricing(customerId) : null;
    const priceChannelId = await getPriceChannelId(
        customer?.custom?.fields?.priceChannelId as string | undefined,
    );
    const queryArgs: Record<string, string | number> = {
        where: `id in (${ids.map((id) => JSON.stringify(id)).join(',')})`,
        limit: ids.length,
        priceCurrency: market.currency,
        priceCountry: market.country,
    };

    if (customer?.customerGroup?.id) {
        queryArgs.priceCustomerGroup = customer.customerGroup.id;
    }

    if (priceChannelId) {
        queryArgs.priceChannel = priceChannelId;
    }

    const response = await apiRoot
        .withProjectKey({
            projectKey: process.env.CT_PROJECT_KEY!,
        })
        .productProjections()
        .get({ queryArgs })
        .execute();
    const products = response.body.results;
    const skus = products.flatMap((product) => [
        product.masterVariant.sku,
        ...product.variants.map((variant) => variant.sku),
    ]).filter((sku): sku is string => Boolean(sku));
    const [inventoryMap, ratings, storeAvailability] = await Promise.all([
        getInventoryMapBySkus(skus),
        Promise.all(products.map((product) => getProductRating(product.id))),
        Promise.all(
            products.map((product) =>
                isProductAvailableInCustomerStore(product.id),
            ),
        ),
    ]);

    return products.map((product, index) => {
        const variants = [product.masterVariant, ...product.variants];
        const variantQuantities = Object.fromEntries(
            variants
                .filter((variant) => variant.sku)
                .map((variant) => [
                    variant.sku as string,
                    inventoryMap[variant.sku as string] ??
                        variant.availability?.availableQuantity ??
                        0,
                ]),
        );

        return {
            product,
            rating: ratings[index],
            storeAvailable: storeAvailability[index],
            availableQuantity:
                variantQuantities[product.masterVariant.sku ?? ''] ?? 0,
            variantQuantities,
        };
    });
}
