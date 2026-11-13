import type {
    Price,
    ProductVariant,
    RecurrencePolicy,
    RecurrencePolicySchedule,
} from '@commercetools/platform-sdk';

export type SubscriptionOffer = {
    sku: string;
    recurrencePolicyId: string;
    recurrencePolicyName: string;
    schedule: RecurrencePolicySchedule;
    price: Price['value'];
};

export type SubscriptionPriceContext = {
    locale: string;
    currency: string;
    country: string;
    channelId?: string;
    customerGroupId?: string;
};

function isPriceAvailable(
    price: Price,
    context: SubscriptionPriceContext,
    now: number,
) {
    return (
        price.value.currencyCode === context.currency &&
        (!price.country || price.country === context.country) &&
        (!price.channel || price.channel.id === context.channelId) &&
        (!price.customerGroup ||
            price.customerGroup.id === context.customerGroupId) &&
        (!price.validFrom || Date.parse(price.validFrom) <= now) &&
        (!price.validUntil || Date.parse(price.validUntil) > now)
    );
}

function getPricePriority(
    price: Price,
    context: SubscriptionPriceContext,
) {
    return (
        (price.customerGroup?.id === context.customerGroupId ? 100 : 0) +
        (price.channel?.id === context.channelId ? 10 : 0) +
        (price.country ? 1 : 0)
    );
}

export function mapSubscriptionOffersFromVariants(
    variants: Array<Pick<ProductVariant, 'sku' | 'recurrencePrices'>>,
    policies: RecurrencePolicy[],
    context: SubscriptionPriceContext,
    now = Date.now(),
): SubscriptionOffer[] {
    const policyById = new Map(policies.map((policy) => [policy.id, policy]));

    return variants.flatMap((variant) => {
        if (!variant.sku) return [];

        const bestPriceByPolicy = new Map<
            string,
            { price: Price; priority: number }
        >();

        for (const price of variant.recurrencePrices ?? []) {
            const policyId = price.recurrencePolicy?.id;
            if (
                !policyId ||
                !policyById.has(policyId) ||
                !isPriceAvailable(price, context, now)
            ) {
                continue;
            }

            const priority = getPricePriority(price, context);
            const current = bestPriceByPolicy.get(policyId);
            if (!current || priority > current.priority) {
                bestPriceByPolicy.set(policyId, { price, priority });
            }
        }

        return [...bestPriceByPolicy.entries()].map(([policyId, { price }]) => {
            const policy = policyById.get(policyId)!;
            const localizedName =
                policy.name?.[context.locale] ??
                policy.name?.['en-US'] ??
                Object.values(policy.name ?? {})[0] ??
                policy.key;

            return {
                sku: variant.sku!,
                recurrencePolicyId: policyId,
                recurrencePolicyName: localizedName,
                schedule: policy.schedule,
                price: price.discounted?.value ?? price.value,
            };
        });
    });
}

export function selectSubscriptionOffersForVariant(
    offers: SubscriptionOffer[],
    sku?: string,
): SubscriptionOffer[] {
    return sku ? offers.filter((offer) => offer.sku === sku) : [];
}
