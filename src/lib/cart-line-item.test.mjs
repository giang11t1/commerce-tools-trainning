import assert from 'node:assert/strict';
import test from 'node:test';
import {
    createCartLineItemDraft,
    getLineItemPurchaseType,
} from './cart-line-item.ts';

const recurringPrice = {
    currencyCode: 'USD',
    centAmount: 1099,
    fractionDigits: 2,
};

test('one-time add draft leaves commercetools platform pricing unchanged', () => {
    const draft = createCartLineItemDraft({
        productId: 'product-id',
        variantId: 1,
        quantity: 1,
        distributionChannelId: 'channel-id',
    });

    assert.equal(draft.productId, 'product-id');
    assert.deepEqual(draft.distributionChannel, {
        typeId: 'channel',
        id: 'channel-id',
    });
    assert.equal(draft.externalPrice, undefined);
    assert.equal(draft.recurrenceInfo, undefined);
    assert.equal(getLineItemPurchaseType({}), 'one-time');
});

test('recurring add draft uses the commercetools recurring price and policy', () => {
    const draft = createCartLineItemDraft({
        productId: 'product-id',
        variantId: 1,
        quantity: 2,
        distributionChannelId: 'channel-id',
        recurringPrice: {
            recurrencePolicyId: 'monthly-policy-id',
            price: recurringPrice,
        },
    });

    assert.deepEqual(draft.externalPrice, recurringPrice);
    assert.deepEqual(draft.recurrenceInfo, {
        recurrencePolicy: {
            typeId: 'recurrence-policy',
            id: 'monthly-policy-id',
        },
        priceSelectionMode: 'Fixed',
    });
    assert.equal(
        getLineItemPurchaseType({
            recurrenceInfo: {
                recurrencePolicy: {
                    typeId: 'recurrence-policy',
                    id: 'monthly-policy-id',
                },
                priceSelectionMode: 'Fixed',
            },
        }),
        'subscription',
    );
});
