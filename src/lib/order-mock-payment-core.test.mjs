import assert from 'node:assert/strict';
import { test } from 'node:test';
import { payApprovedOrder, mockPaymentKey } from './order-mock-payment-core.ts';

function fixture() {
    const state = {
        order: {
            id: 'existing-order', version: 1, orderState: 'Open', paymentState: 'Pending',
            customerId: 'buyer', businessUnit: { key: 'unit' },
            totalPrice: { type: 'centPrecision', centAmount: 124000, currencyCode: 'USD', fractionDigits: 2 },
        },
        approval: 'Approved', canPay: true, customerId: 'buyer', unitKey: 'unit',
        payments: [], successfulTransitions: 0, fail: undefined,
    };
    const conflict = () => Object.assign(new Error('version conflict'), { statusCode: 409 });
    const copy = (value) => structuredClone(value);
    function failure(stage) {
        if (state.fail === stage) {
            state.fail = undefined;
            throw new Error(stage);
        }
    }
    const store = {
        async snapshot() {
            failure('snapshot');
            return copy({
                order: state.order, approval: state.approval, canPay: state.canPay,
                customerId: state.customerId, unitKey: state.unitKey,
            });
        },
        async findPayment(key) {
            return copy(state.payments.find((payment) => payment.key === key));
        },
        async createPayment(draft) {
            failure('create');
            if (state.payments.some((payment) => payment.key === draft.key)) {
                throw Object.assign(new Error('duplicate key'), {
                    statusCode: 400, body: { errors: [{ code: 'DuplicateField' }] },
                });
            }
            const payment = {
                ...copy(draft), id: 'single-payment', version: 1,
                transactions: draft.transactions.map((transaction) => ({ ...copy(transaction), id: 'single-charge' })),
            };
            state.payments.push(payment);
            failure('createResponse');
            return copy(payment);
        },
        async updatePayment(payment, actions) {
            failure('charge');
            const current = state.payments.find(({ id }) => id === payment.id);
            if (payment.version !== current.version) throw conflict();
            for (const action of actions) {
                assert.equal(action.action, 'changeTransactionState');
                const transaction = current.transactions.find(({ id }) => id === action.transactionId);
                assert.equal(transaction.state, 'Initial');
                transaction.state = action.state;
                state.successfulTransitions += 1;
            }
            current.version += 1;
            failure('chargeResponse');
            return copy(current);
        },
        async updateOrder(order, actions) {
            if (order.version !== state.order.version) throw conflict();
            for (const action of actions) {
                if (action.action === 'addPayment') {
                    failure('attach');
                    state.order.paymentInfo = { payments: [action.payment] };
                    state.order.version += 1;
                    failure('attachResponse');
                } else {
                    assert.equal(action.action, 'changePaymentState');
                    failure('paid');
                    assert.equal(state.payments[0].transactions[0].state, 'Success');
                    state.order.paymentState = action.paymentState;
                    state.order.version += 1;
                    failure('paidResponse');
                }
            }
            return copy(state.order);
        },
    };
    return { state, store };
}

for (const approval of ['Pending', 'Rejected', 'Unknown']) {
    test(`${approval} approval blocks payment without creating resources`, async () => {
        const { state, store } = fixture();
        state.approval = approval;
        await assert.rejects(payApprovedOrder(store));
        assert.equal(state.payments.length, 0);
        assert.equal(state.order.paymentState, 'Pending');
    });
}

test('approved payment pays the same Open Order using authoritative total and currency', async () => {
    const { state, store } = fixture();
    const order = await payApprovedOrder(store);
    assert.equal(order.id, 'existing-order');
    assert.equal(order.orderState, 'Open');
    assert.equal(order.paymentState, 'Paid');
    assert.equal(state.payments.length, 1);
    assert.equal(state.payments[0].key, mockPaymentKey(order.id));
    assert.deepEqual(state.payments[0].amountPlanned, { centAmount: 124000, currencyCode: 'USD' });
    assert.equal(state.payments[0].transactions.length, 1);
    assert.equal(state.payments[0].transactions[0].state, 'Success');
    assert.equal(state.order.paymentInfo.payments[0].id, state.payments[0].id);
});

for (const unauthorized of ['canPay', 'customerId', 'unitKey']) {
    test(`rejects unauthorized ${unauthorized} before creating Payment`, async () => {
        const { state, store } = fixture();
        state[unauthorized] = unauthorized === 'canPay' ? false : 'other';
        await assert.rejects(payApprovedOrder(store), { code: 'unauthorized', status: 403 });
        assert.equal(state.payments.length, 0);
    });
}

test('already Paid is idempotent on repeated requests and refreshes', async () => {
    const { state, store } = fixture();
    await payApprovedOrder(store);
    await payApprovedOrder(store);
    await payApprovedOrder(store);
    assert.equal(state.payments.length, 1);
    assert.equal(state.successfulTransitions, 1);
});

test('concurrent double submission creates one Payment and one successful Charge', async () => {
    const { state, store } = fixture();
    const results = await Promise.all([payApprovedOrder(store), payApprovedOrder(store), payApprovedOrder(store)]);
    assert.ok(results.every(({ paymentState, id }) => paymentState === 'Paid' && id === state.order.id));
    assert.equal(state.payments.length, 1);
    assert.equal(state.successfulTransitions, 1);
    assert.equal(state.payments[0].transactions.length, 1);
});

for (const stage of ['create', 'createResponse', 'attach', 'attachResponse', 'charge', 'chargeResponse', 'paid', 'paidResponse']) {
    test(`retry recovers after failure at ${stage} without duplicates`, async () => {
        const { state, store } = fixture();
        state.fail = stage;
        await assert.rejects(payApprovedOrder(store), new RegExp(stage));
        const result = await payApprovedOrder(store);
        assert.equal(result.paymentState, 'Paid');
        assert.equal(result.id, 'existing-order');
        assert.equal(result.orderState, 'Open');
        assert.equal(state.payments.length, 1);
        assert.equal(state.payments[0].transactions.length, 1);
        assert.equal(state.successfulTransitions, 1);
    });
}

test('existing unrelated Payment blocks payment, even on an Approved Order', async () => {
    const { state, store } = fixture();
    state.order.paymentInfo = { payments: [{ typeId: 'payment', id: 'real-psp-payment' }] };
    await assert.rejects(payApprovedOrder(store), { code: 'conflictingPayment' });
    assert.equal(state.payments.length, 0);
});

for (const mutate of [
    (payment) => { payment.transactions[0].state = 'Pending'; },
    (payment) => { payment.transactions.push({ ...payment.transactions[0], id: 'unexpected-charge' }); },
    (payment) => { payment.amountPlanned.centAmount += 1; },
    (payment) => { payment.customer.id = 'other-buyer'; },
    (payment) => { payment.amountPlanned.currencyCode = 'EUR'; },
]) {
    test('mismatched or externally processing Payment cannot be reused', async () => {
        const { state, store } = fixture();
        state.fail = 'attach';
        await assert.rejects(payApprovedOrder(store));
        mutate(state.payments[0]);
        await assert.rejects(payApprovedOrder(store), { code: 'conflictingPayment' });
        assert.equal(state.successfulTransitions, 0);
        assert.equal(state.order.paymentState, 'Pending');
    });
}

test('lost approval before Charge prevents success', async () => {
    const { state, store } = fixture();
    const originalUpdate = store.updateOrder;
    store.updateOrder = async (...args) => {
        const result = await originalUpdate(...args);
        state.approval = 'Rejected';
        return result;
    };
    await assert.rejects(payApprovedOrder(store), { code: 'rejected' });
    assert.equal(state.successfulTransitions, 0);
    assert.equal(state.order.paymentState, 'Pending');
});

test('retries are bounded for persistent version conflicts', async () => {
    const { state, store } = fixture();
    let attempts = 0;
    store.createPayment = async () => {
        attempts += 1;
        throw Object.assign(new Error('conflict'), { statusCode: 409 });
    };
    await assert.rejects(payApprovedOrder(store), /conflict/);
    assert.equal(attempts, 5);
    assert.equal(state.payments.length, 0);
});

test('an upstream approval lookup failure is not treated as an Approved Flow', async () => {
    const { state, store } = fixture();
    state.fail = 'snapshot';
    await assert.rejects(payApprovedOrder(store), /snapshot/);
    assert.equal(state.payments.length, 0);
});

test('revoking permission after attaching Payment prevents a successful Charge', async () => {
    const { state, store } = fixture();
    const originalUpdate = store.updateOrder;
    store.updateOrder = async (...args) => {
        const order = await originalUpdate(...args);
        state.canPay = false;
        return order;
    };
    await assert.rejects(payApprovedOrder(store), { code: 'unauthorized' });
    assert.equal(state.successfulTransitions, 0);
    assert.equal(state.order.paymentState, 'Pending');
});

test('changed Order amount after successful Charge blocks marking Paid', async () => {
    const { state, store } = fixture();
    const originalUpdate = store.updatePayment;
    store.updatePayment = async (...args) => {
        const payment = await originalUpdate(...args);
        state.order.totalPrice.centAmount += 100;
        state.order.version += 1;
        return payment;
    };
    await assert.rejects(payApprovedOrder(store), { code: 'conflictingPayment' });
    assert.equal(state.order.paymentState, 'Pending');
    assert.equal(state.successfulTransitions, 1);
});

for (const change of [
    (order) => { order.orderState = 'Cancelled'; },
    (order) => { order.paymentState = 'BalanceDue'; },
    (order) => { order.totalPrice.centAmount = 0; },
]) {
    test('unsupported Order state or invalid amount blocks payment', async () => {
        const { state, store } = fixture();
        change(state.order);
        await assert.rejects(payApprovedOrder(store), { code: 'blocked' });
        assert.equal(state.payments.length, 0);
    });
}
