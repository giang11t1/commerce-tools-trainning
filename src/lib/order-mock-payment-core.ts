import type { Order, OrderUpdateAction, Payment, PaymentDraft, PaymentUpdateAction } from '@commercetools/platform-sdk';

export type ApprovalStatus = 'Pending' | 'Approved' | 'Rejected' | 'Unknown';
export type PaymentEligibility = 'paid' | 'pending' | 'rejected' | 'eligible' | 'blocked';

export class OrderPaymentError extends Error {
    readonly code: string;
    readonly status: number;
    constructor(code: string, status = 409) {
        super(code);
        this.name = 'OrderPaymentError';
        this.code = code;
        this.status = status;
    }
}

export function mockPaymentKey(orderId: string) {
    return `b2b-mock-${orderId}`;
}

export function paymentEligibility(order: Order, approval: ApprovalStatus): PaymentEligibility {
    if (order.paymentState === 'Paid') return 'paid';
    if (approval === 'Pending') return 'pending';
    if (approval === 'Rejected') return 'rejected';
    if (approval !== 'Approved' || order.orderState !== 'Open' ||
        ![undefined, 'Pending', 'Failed'].includes(order.paymentState) ||
        !Number.isSafeInteger(order.totalPrice.centAmount) || order.totalPrice.centAmount <= 0) return 'blocked';
    return 'eligible';
}

export type PaymentSnapshot = {
    order: Order;
    approval: ApprovalStatus;
    customerId: string;
    unitKey: string;
    canPay: boolean;
};

export interface MockPaymentStore {
    // Must authenticate, authorize ownership/active Business Unit and re-read approval on each call.
    snapshot(): Promise<PaymentSnapshot>;
    findPayment(key: string): Promise<Payment | undefined>;
    createPayment(draft: PaymentDraft): Promise<Payment>;
    updatePayment(payment: Payment, actions: PaymentUpdateAction[]): Promise<Payment>;
    updateOrder(order: Order, actions: OrderUpdateAction[]): Promise<Order>;
}

function assertSnapshot(snapshot: PaymentSnapshot) {
    const { order, customerId, unitKey, approval, canPay } = snapshot;
    if (!canPay || order.customerId !== customerId || order.businessUnit?.key !== unitKey) {
        throw new OrderPaymentError('unauthorized', 403);
    }
    const eligibility = paymentEligibility(order, approval);
    if (eligibility !== 'eligible' && eligibility !== 'paid') {
        throw new OrderPaymentError(eligibility);
    }
}

export function validateMockPayment(payment: Payment, snapshot: PaymentSnapshot) {
    const { order, customerId } = snapshot;
    if (payment.key !== mockPaymentKey(order.id) ||
        payment.customer?.id !== customerId ||
        payment.interfaceId !== order.id ||
        payment.paymentMethodInfo.paymentInterface !== 'b2b-post-approval-mock' ||
        payment.paymentMethodInfo.method !== 'sample' ||
        payment.amountPlanned.centAmount !== order.totalPrice.centAmount ||
        payment.amountPlanned.currencyCode !== order.totalPrice.currencyCode ||
        payment.transactions.length !== 1) {
        throw new OrderPaymentError('conflictingPayment');
    }
    const transaction = payment.transactions[0];
    if (transaction.type !== 'Charge' ||
        transaction.interactionId !== mockPaymentKey(order.id) ||
        transaction.amount.centAmount !== order.totalPrice.centAmount ||
        transaction.amount.currencyCode !== order.totalPrice.currencyCode ||
        !['Initial', 'Success'].includes(transaction.state)) {
        throw new OrderPaymentError('conflictingPayment');
    }
}

export function assertPaymentReferences(order: Order, paymentId?: string) {
    if (order.paymentInfo?.payments.some((reference) => reference.id !== paymentId)) {
        throw new OrderPaymentError('conflictingPayment');
    }
}

function isConflict(error: unknown) {
    if (!error || typeof error !== 'object') return false;
    const candidate = error as { statusCode?: number; body?: { errors?: { code?: string }[] } };
    return candidate.statusCode === 409 ||
        candidate.body?.errors?.some(({ code }) => code === 'DuplicateField');
}

export async function payApprovedOrder(store: MockPaymentStore): Promise<Order> {
    // Unique Payment key + resource versions coordinate across processes, not just this browser.
    for (let attempt = 0; attempt < 5; attempt += 1) {
        try {
            let snapshot = await store.snapshot();
            assertSnapshot(snapshot);
            if (snapshot.order.paymentState === 'Paid') return snapshot.order;

            const key = mockPaymentKey(snapshot.order.id);
            let payment = await store.findPayment(key);
            assertPaymentReferences(snapshot.order, payment?.id);
            if (!payment) {
                const amount = {
                    centAmount: snapshot.order.totalPrice.centAmount,
                    currencyCode: snapshot.order.totalPrice.currencyCode,
                };
                payment = await store.createPayment({
                    key,
                    interfaceId: snapshot.order.id,
                    customer: { typeId: 'customer', id: snapshot.customerId },
                    amountPlanned: amount,
                    paymentMethodInfo: { paymentInterface: 'b2b-post-approval-mock', method: 'sample' },
                    transactions: [{ type: 'Charge', amount, state: 'Initial', interactionId: key }],
                });
            }
            validateMockPayment(payment, snapshot);
            const paymentId = payment.id;

            if (!snapshot.order.paymentInfo?.payments.some(({ id }) => id === paymentId)) {
                await store.updateOrder(snapshot.order, [{
                    action: 'addPayment', payment: { typeId: 'payment', id: payment.id },
                }]);
            }

            snapshot = await store.snapshot();
            assertSnapshot(snapshot);
            if (snapshot.order.paymentState === 'Paid') return snapshot.order;
            assertPaymentReferences(snapshot.order, payment.id);
            if (!snapshot.order.paymentInfo?.payments.some(({ id }) => id === paymentId)) {
                throw new OrderPaymentError('conflictingPayment');
            }
            // Read again so a concurrent retry cannot record another transaction.
            const currentPayment = await store.findPayment(key);
            if (!currentPayment) throw new OrderPaymentError('paymentMissing');
            payment = currentPayment;
            validateMockPayment(payment, snapshot);
            if (payment.transactions[0].state !== 'Success') {
                payment = await store.updatePayment(payment, [{
                    action: 'changeTransactionState',
                    transactionId: payment.transactions[0].id,
                    state: 'Success',
                }]);
            }
            validateMockPayment(payment, snapshot);
            if (payment.transactions[0].state !== 'Success') throw new OrderPaymentError('paymentIncomplete');

            snapshot = await store.snapshot();
            assertSnapshot(snapshot);
            if (snapshot.order.paymentState === 'Paid') return snapshot.order;
            assertPaymentReferences(snapshot.order, payment.id);
            validateMockPayment(payment, snapshot);
            if (!snapshot.order.paymentInfo?.payments.some(({ id }) => id === payment.id)) {
                throw new OrderPaymentError('conflictingPayment');
            }
            return await store.updateOrder(snapshot.order, [{ action: 'changePaymentState', paymentState: 'Paid' }]);
        } catch (error) {
            if (!isConflict(error) || attempt === 4) throw error;
        }
    }
    throw new OrderPaymentError('conflict');
}
