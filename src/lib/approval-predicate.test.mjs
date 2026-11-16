import assert from 'node:assert/strict';
import test from 'node:test';
import {
    buildApprovalPredicate,
    isValidApprovalCondition,
} from './approval-predicate.ts';

test('builds a currency-aware order total predicate', () => {
    assert.equal(
        buildApprovalPredicate(
            [{ field: 'totalPrice', operator: '>=', value: '500.00', currency: 'USD' }],
            'and',
        ),
        '(totalPrice >= "500.00 USD")',
    );
});

test('combines supported currency and country conditions with AND or OR', () => {
    const conditions = [
        { field: 'currency', value: 'EUR' },
        { field: 'country', value: 'DE' },
    ];

    assert.equal(
        buildApprovalPredicate([...conditions], 'and'),
        '(totalPrice.currencyCode = "EUR") and (shippingAddress.country = "DE")',
    );
    assert.equal(
        buildApprovalPredicate([...conditions], 'or'),
        '(totalPrice.currencyCode = "EUR") or (shippingAddress.country = "DE")',
    );
});

test('rejects invalid or injection-shaped condition values', () => {
    assert.equal(isValidApprovalCondition(null), false);
    assert.equal(
        isValidApprovalCondition({
            field: 'totalPrice',
            operator: '>=',
            value: '10" or 1=1',
            currency: 'USD',
        }),
        false,
    );
    assert.equal(isValidApprovalCondition({ field: 'currency', value: 'USDD' }), false);
    assert.equal(isValidApprovalCondition({ field: 'country', value: 'USA' }), false);
});
