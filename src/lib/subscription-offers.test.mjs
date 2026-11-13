import assert from 'node:assert/strict';
import test from 'node:test';
import {
    mapSubscriptionOffersFromVariants,
    selectSubscriptionOffersForVariant,
} from './subscription-offers.ts';

const policy = {
    id: 'monthly-policy',
    key: 'monthly-subscription',
    name: { 'en-US': 'Monthly Subscription' },
    schedule: { type: 'standard', value: 1, intervalUnit: 'Months' },
};

const money = (centAmount) => ({
    type: 'centPrecision',
    currencyCode: 'USD',
    centAmount,
    fractionDigits: 2,
});

test('maps recurrencePrices by policy and excludes ineligible or unlinked prices', () => {
    const offers = mapSubscriptionOffersFromVariants(
        [
            {
                sku: 'CARM-023',
                recurrencePrices: [
                    {
                        value: money(30900),
                        country: 'US',
                        recurrencePolicy: {
                            typeId: 'recurrence-policy',
                            id: 'monthly-policy',
                        },
                    },
                    {
                        value: money(49900),
                        country: 'US',
                    },
                    {
                        value: money(22500),
                        country: 'US',
                        channel: {
                            typeId: 'channel',
                            id: 'wholesale-channel',
                        },
                        customerGroup: {
                            typeId: 'customer-group',
                            id: 'wholesale-group',
                        },
                        recurrencePolicy: {
                            typeId: 'recurrence-policy',
                            id: 'monthly-policy',
                        },
                    },
                ],
            },
        ],
        [policy],
        {
            locale: 'en-US',
            currency: 'USD',
            country: 'US',
            channelId: 'retail-channel',
        },
        Date.parse('2026-11-04T00:00:00Z'),
    );

    assert.equal(offers.length, 1);
    assert.deepEqual(offers[0], {
        sku: 'CARM-023',
        recurrencePolicyId: 'monthly-policy',
        recurrencePolicyName: 'Monthly Subscription',
        schedule: policy.schedule,
        price: money(30900),
    });
});

test('keeps policy-linked offers available to render even if they cost more than one-time price', () => {
    const oneTimePrice = money(29900);
    const offers = [
        {
            sku: 'CARM-023',
            recurrencePolicyId: 'monthly-policy',
            recurrencePolicyName: 'Monthly Subscription',
            schedule: policy.schedule,
            price: money(30900),
        },
    ];

    assert.ok(offers[0].price.centAmount > oneTimePrice.centAmount);
    assert.deepEqual(
        selectSubscriptionOffersForVariant(offers, 'CARM-023'),
        offers,
    );
    assert.deepEqual(selectSubscriptionOffersForVariant(offers, 'other-sku'), []);
});
