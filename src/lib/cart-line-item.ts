import type { LineItem, LineItemDraft, Money } from '@commercetools/platform-sdk';

export type RecurringLineItemPrice = {
    recurrencePolicyId: string;
    price: Money;
};

export function createCartLineItemDraft({
    productId,
    variantId,
    quantity,
    distributionChannelId,
    recurringPrice,
}: {
    productId: string;
    variantId: number;
    quantity: number;
    distributionChannelId?: string;
    recurringPrice?: RecurringLineItemPrice;
}): LineItemDraft {
    return {
        productId,
        variantId,
        quantity,
        ...(distributionChannelId && {
            distributionChannel: {
                typeId: 'channel',
                id: distributionChannelId,
            },
        }),
        ...(recurringPrice && {
            externalPrice: recurringPrice.price,
            recurrenceInfo: {
                recurrencePolicy: {
                    typeId: 'recurrence-policy',
                    id: recurringPrice.recurrencePolicyId,
                },
                priceSelectionMode: 'Fixed',
            },
        }),
    };
}

export function getLineItemPurchaseType(
    lineItem: Pick<LineItem, 'recurrenceInfo'>,
): 'one-time' | 'subscription' {
    return lineItem.recurrenceInfo ? 'subscription' : 'one-time';
}
