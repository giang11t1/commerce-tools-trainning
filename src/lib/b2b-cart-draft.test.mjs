import assert from 'node:assert/strict';
import test from 'node:test';
import { assertBusinessCart, assertBusinessCartMigration, assertBusinessOrderCart, createBusinessCartDraft } from './b2b-cart-draft.ts';
import { isUsableCart } from './cart-lifecycle.ts';

function cart(overrides = {}) {
    return {
        id: 'cart-id', version: 3, cartState: 'Active', customerId: 'buyer-id',
        store: { typeId: 'store', key: 'store-key' },
        totalPrice: { type: 'centPrecision', currencyCode: 'USD', centAmount: 145500, fractionDigits: 2 },
        taxMode: 'Platform', shippingMode: 'Single', customLineItems: [],
        directDiscounts: [], itemShippingAddresses: [], discountCodes: [],
        shippingAddress: { country: 'US' }, billingAddress: { country: 'US' },
        shippingInfo: { shippingMethod: { typeId: 'shipping-method', id: 'shipping-id' } },
        lineItems: [{
            id: 'line-id', productId: 'product-id', variant: { id: 1 }, quantity: 3,
            priceMode: 'Platform', price: { value: { currencyCode: 'USD', centAmount: 48500 } },
            totalPrice: { currencyCode: 'USD', centAmount: 145500 },
            distributionChannel: { typeId: 'channel', id: 'price-channel' },
            supplyChannel: { typeId: 'channel', id: 'warehouse' },
        }],
        ...overrides,
    };
}

test('creates an Associate draft preserving Store, quantity, channels, addresses and discounts', () => {
    const source = cart({ discountCodes: [{
        state: 'MatchesCart', discountCode: { typeId: 'discount-code', id: 'coupon-id', obj: { code: 'SAVE' } },
    }] });
    const draft = createBusinessCartDraft(source, 'buyer-id', 'unit-key');
    assert.deepEqual(draft.businessUnit, { typeId: 'business-unit', key: 'unit-key' });
    assert.equal(draft.customerId, 'buyer-id');
    assert.deepEqual(draft.store, source.store);
    assert.deepEqual(draft.discountCodes, ['SAVE']);
    assert.equal(draft.lineItems[0].quantity, 3);
    assert.deepEqual(draft.lineItems[0].distributionChannel, source.lineItems[0].distributionChannel);
    assert.deepEqual(draft.lineItems[0].supplyChannel, source.lineItems[0].supplyChannel);
    assert.deepEqual(draft.shippingAddress, source.shippingAddress);
    assert.deepEqual(draft.billingAddress, source.billingAddress);
    assert.deepEqual(draft.shippingMethod, source.shippingInfo.shippingMethod);
    assert.equal(source.businessUnit, undefined);
});

test('preserves external recurring prices rather than replacing them with platform prices', () => {
    const source = cart();
    source.lineItems[0].priceMode = 'ExternalPrice';
    source.lineItems[0].recurrenceInfo = {
        recurrencePolicy: { typeId: 'recurrence-policy', id: 'monthly' }, priceSelectionMode: 'Fixed',
    };
    const line = createBusinessCartDraft(source, 'buyer-id', 'unit-key').lineItems[0];
    assert.deepEqual(line.externalPrice, source.lineItems[0].price.value);
    assert.deepEqual(line.recurrenceInfo, source.lineItems[0].recurrenceInfo);
});

test('refuses another customer, paid carts, ordered carts and lossy migrations', () => {
    for (const patch of [
        { customerId: 'another-customer' }, { cartState: 'Ordered' },
        { paymentInfo: { payments: [{ id: 'payment-id' }] } }, { taxMode: 'ExternalAmount' },
        { shippingMode: 'Multiple' }, { customLineItems: [{}] }, { directDiscounts: [{}] },
        { discountCodes: [{ discountCode: { id: 'unexpanded' } }] },
    ]) {
        assert.throws(() => createBusinessCartDraft(cart(patch), 'buyer-id', 'unit-key'));
    }
});

test('rejects price, tax, quantity, discount and Store changes before selecting the new cart', () => {
    const source = cart();
    assert.doesNotThrow(() => assertBusinessCartMigration(source, structuredClone(source)));
    for (const change of [
        (value) => { value.totalPrice.centAmount += 1; },
        (value) => { value.lineItems[0].quantity += 1; },
        (value) => { value.taxedPrice = { totalTax: { centAmount: 1 } }; },
        (value) => { value.discountCodes = [{ discountCode: { id: 'other' }, state: 'MatchesCart' }]; },
        (value) => { value.store.key = 'other-store'; },
    ]) {
        const target = structuredClone(source);
        change(target);
        assert.throws(() => assertBusinessCartMigration(source, target));
    }
});

test('business carts require matching customer and Business Unit; B2C matching is unchanged', () => {
    const consumer = cart();
    assert.equal(isUsableCart(consumer, { customerId: 'buyer-id', storeKey: 'store-key' }), true);
    const business = cart({ businessUnit: { typeId: 'business-unit', key: 'unit-key' } });
    assert.equal(isUsableCart(business, { customerId: 'buyer-id', businessUnitKey: 'unit-key' }), true);
    assert.equal(isUsableCart(business, { customerId: 'buyer-id' }), false);
    assert.throws(() => assertBusinessCart(business, 'other', 'unit-key'));
    assert.throws(() => assertBusinessCart(business, 'buyer-id', 'other-unit'));
    assert.doesNotThrow(() => assertBusinessCart(business, 'buyer-id', 'unit-key'));
});

test('submission refuses stale versions, already ordered carts, payment sessions and incomplete shipping', () => {
    const business = cart({
        businessUnit: { typeId: 'business-unit', key: 'unit-key' },
        shippingInfo: { shippingMethodState: 'MatchesCart', shippingMethod: { id: 'shipping-id' } },
    });
    assert.doesNotThrow(() => assertBusinessOrderCart(business, 'buyer-id', 'unit-key', 3));
    assert.throws(() => assertBusinessOrderCart(business, 'buyer-id', 'unit-key', 2), /cart changed/);
    for (const patch of [
        { cartState: 'Ordered' }, { lineItems: [] }, { shippingAddress: undefined },
        { billingAddress: undefined }, { shippingInfo: { shippingMethodState: 'DoesNotMatchCart' } },
        { paymentInfo: { payments: [{ id: 'payment-id' }] } },
    ]) {
        assert.throws(() => assertBusinessOrderCart({ ...business, ...patch }, 'buyer-id', 'unit-key', 3));
    }
});
