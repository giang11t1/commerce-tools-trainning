import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    computeSkuAvailability,
    resolveEligibleSupplyChannelIds,
    selectLineItemSupplyChannelId,
} from './inventory-availability.ts';

const entries = [
    { sku: 'oo789-uv-2015', availableQuantity: 1000, supplyChannel: { id: 'default-warehouse' } },
    { sku: 'oo789-uv-2015', availableQuantity: 1000, supplyChannel: { id: 'eu-warehouse' } },
    { sku: 'oo789-uv-2015', availableQuantity: 1000, supplyChannel: { id: 'us-warehouse' } },
];

test('uses only the store supply channel', () => {
    const result = computeSkuAvailability(['oo789-uv-2015'], entries, ['us-warehouse']);
    assert.deepEqual(result['oo789-uv-2015'], { availableQuantity: 1000, supplyChannelId: 'us-warehouse' });
});

test('does not sum quantities across eligible warehouses', () => {
    const result = computeSkuAvailability(
        ['oo789-uv-2015'],
        [...entries.slice(0, 2), { sku: 'oo789-uv-2015', availableQuantity: 30, supplyChannel: { id: 'us-warehouse' } }],
        ['eu-warehouse', 'us-warehouse'],
    );
    assert.deepEqual(result['oo789-uv-2015'], { availableQuantity: 1000, supplyChannelId: 'eu-warehouse' });
});

test('ignores unrelated and channel-less entries and reports zero', () => {
    const result = computeSkuAvailability(
        ['oo789-uv-2015', 'missing'],
        [...entries, { sku: 'oo789-uv-2015', availableQuantity: 5 }],
        ['other-warehouse'],
    );
    assert.deepEqual(result, {
        'oo789-uv-2015': { availableQuantity: 0 },
        missing: { availableQuantity: 0 },
    });
});

test('ignores entries for SKUs that were not requested', () => {
    const result = computeSkuAvailability(['a'], entries, ['us-warehouse']);
    assert.deepEqual(Object.keys(result), ['a']);
});

test('resolves store channels, falling back to the default warehouse', () => {
    assert.deepEqual(resolveEligibleSupplyChannelIds(['us', 'us'], 'default'), ['us']);
    assert.deepEqual(resolveEligibleSupplyChannelIds([], 'default'), ['default']);
    assert.deepEqual(resolveEligibleSupplyChannelIds(undefined, undefined), []);
});

test('selects line item supply channel', () => {
    assert.equal(selectLineItemSupplyChannelId({ availableQuantity: 3, supplyChannelId: 'eu' }, ['us', 'eu']), 'eu');
    assert.equal(selectLineItemSupplyChannelId({ availableQuantity: 0 }, ['us', 'eu']), 'us');
    assert.equal(selectLineItemSupplyChannelId(undefined, []), undefined);
});
