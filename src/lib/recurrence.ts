import 'server-only';

import type {
    ProductProjection,
    RecurrencePolicy,
} from '@commercetools/platform-sdk';
import { getLocale } from 'next-intl/server';
import { apiRoot } from './commercetools';
import { getCartSessionContext } from './cart';
import { getCustomerForPricing } from './customer';
import { getCommerceMarket } from './commerce-market';
import {
    mapSubscriptionOffersFromVariants,
    type SubscriptionOffer,
} from './subscription-offers';

async function getPolicies(): Promise<RecurrencePolicy[]> {
    const projectKey = process.env.CT_PROJECT_KEY!;
    const policies: RecurrencePolicy[] = [];
    const limit = 100;
    let offset = 0;

    while (true) {
        const response = await apiRoot
            .withProjectKey({ projectKey })
            .recurrencePolicies()
            .get({ queryArgs: { limit, offset } })
            .execute();
        policies.push(...response.body.results);
        offset += response.body.count;

        if (
            response.body.count < limit ||
            (response.body.total !== undefined && offset >= response.body.total)
        ) {
            return policies;
        }
    }
}

async function getSubscriptionOffersForProduct(
    product: Pick<ProductProjection, 'masterVariant' | 'variants'>,
    locale: string,
): Promise<SubscriptionOffer[]> {
    const variants = [product.masterVariant, ...product.variants];
    if (
        !variants.some((variant) =>
            variant.recurrencePrices?.some((price) => price.recurrencePolicy?.id),
        )
    ) {
        return [];
    }

    const market = getCommerceMarket(locale);
    const cartContext = await getCartSessionContext();
    const customer = cartContext.customerId
        ? await getCustomerForPricing(cartContext.customerId)
        : null;
    const context = {
        locale: market.locale,
        currency: market.currency,
        country: market.country,
        channelId: cartContext.distributionChannelId,
        customerGroupId: customer?.customerGroup?.id,
    };

    const policies = await getPolicies();
    return mapSubscriptionOffersFromVariants(variants, policies, context);
}

export async function getProductSubscriptionOffers(
    product: Pick<ProductProjection, 'masterVariant' | 'variants'>,
    locale: string,
) {
    return getSubscriptionOffersForProduct(product, locale);
}

export async function getSubscriptionOfferForVariant(
    productId: string,
    variantId: number,
    recurrencePolicyId: string,
): Promise<SubscriptionOffer | undefined> {
    const projectKey = process.env.CT_PROJECT_KEY!;
    const market = getCommerceMarket(await getLocale());
    const cartContext = await getCartSessionContext();
    const customer = cartContext.customerId
        ? await getCustomerForPricing(cartContext.customerId)
        : null;
    const queryArgs: Record<string, string> = {
        priceCurrency: market.currency,
        priceCountry: market.country,
        priceRecurrencePolicy: recurrencePolicyId,
    };
    if (cartContext.distributionChannelId) {
        queryArgs.priceChannel = cartContext.distributionChannelId;
    }
    if (customer?.customerGroup?.id) {
        queryArgs.priceCustomerGroup = customer.customerGroup.id;
    }
    if (cartContext.storeKey) {
        queryArgs.storeProjection = cartContext.storeKey;
    }

    const response = await apiRoot
        .withProjectKey({ projectKey })
        .productProjections()
        .withId({ ID: productId })
        .get({ queryArgs })
        .execute();
    const product: ProductProjection = response.body;
    const variant = [product.masterVariant, ...product.variants].find(
        (item) => item.id === variantId,
    );
    if (!variant?.sku) return undefined;

    const offers = await getSubscriptionOffersForProduct(product, market.locale);
    return offers.find((offer) => offer.recurrencePolicyId === recurrencePolicyId);
}
