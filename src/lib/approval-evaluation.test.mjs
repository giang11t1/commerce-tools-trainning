import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateApprovalRules, parseApprovalPredicate } from './approval-evaluation.ts';
import { buildApprovalPredicate } from './approval-predicate.ts';

const cart = (centAmount, currencyCode = 'USD', country = 'US') => ({
    totalPrice: { type: 'centPrecision', centAmount, currencyCode, fractionDigits: 2 },
    shippingAddress: { country },
});
const rule = (predicate, overrides = {}) => ({
    id: overrides.id ?? 'rule-1',
    status: 'Active',
    predicate,
    requesters: [{ associateRole: { typeId: 'associate-role', key: 'buyer' } }],
    ...overrides,
});
const buyer = new Set(['buyer']);

test('requires approval only when the order total matches the rule threshold', () => {
    const rules = [rule(buildApprovalPredicate(
        [{ field: 'totalPrice', operator: '>=', value: '500.00', currency: 'USD' }], 'and'))];
    assert.deepEqual(evaluateApprovalRules(rules, buyer, cart(50000)), { status: 'approval-required', ruleIds: ['rule-1'] });
    assert.deepEqual(evaluateApprovalRules(rules, buyer, cart(49999)), { status: 'no-approval-required' });
});

test('a totalPrice rule in another currency does not match', () => {
    const rules = [rule('totalPrice > "1.00 EUR"')];
    assert.equal(evaluateApprovalRules(rules, buyer, cart(100000)).status, 'no-approval-required');
});

test('no rules, inactive rules, or rules for other requester roles do not require approval', () => {
    assert.equal(evaluateApprovalRules([], buyer, cart(1)).status, 'no-approval-required');
    assert.equal(evaluateApprovalRules([rule('totalPrice > "0 USD"', { status: 'Inactive' })], buyer, cart(100)).status, 'no-approval-required');
    assert.equal(evaluateApprovalRules([rule('totalPrice > "0 USD"')], new Set(['admin']), cart(100)).status, 'no-approval-required');
});

test('supports and/or combinations with standard precedence and parentheses', () => {
    const predicate = buildApprovalPredicate([
        { field: 'currency', value: 'USD' },
        { field: 'country', value: 'DE' },
    ], 'and');
    assert.equal(evaluateApprovalRules([rule(predicate)], buyer, cart(1, 'USD', 'US')).status, 'no-approval-required');
    assert.equal(evaluateApprovalRules([rule(predicate)], buyer, cart(1, 'USD', 'DE')).status, 'approval-required');
    const mixed = 'shippingAddress.country = "DE" or totalPrice.currencyCode = "USD" and totalPrice > "10.00 USD"';
    assert.equal(evaluateApprovalRules([rule(mixed)], buyer, cart(500)).status, 'no-approval-required');
    assert.equal(evaluateApprovalRules([rule(mixed)], buyer, cart(1001)).status, 'approval-required');
});

test('unsupported predicates fail closed instead of being treated as non-matching', () => {
    for (const predicate of ['lineItemCount > 5', 'totalPrice > 100', 'customer.email = "a@b.c"', '(totalPrice > "1 USD"', 'totalPrice != "1.00 USD"']) {
        assert.equal(parseApprovalPredicate(predicate), undefined, predicate);
        assert.equal(evaluateApprovalRules([rule(predicate)], buyer, cart(100)).status, 'unsupported', predicate);
    }
});

test('a matching rule wins over an unsupported rule', () => {
    const result = evaluateApprovalRules([
        rule('lineItemCount > 5', { id: 'unsupported' }),
        rule('totalPrice >= "1.00 USD"', { id: 'match' }),
    ], buyer, cart(100));
    assert.deepEqual(result, { status: 'approval-required', ruleIds: ['match'] });
});
