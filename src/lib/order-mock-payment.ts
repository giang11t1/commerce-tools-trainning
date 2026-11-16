import 'server-only';

import type { Order, Payment } from '@commercetools/platform-sdk';
import { getSelectedBusinessUnit, associateInUnit } from './b2b-context';
import { associateApiRoot, associateClient } from './commercetools';
import { getSession } from './auth';
import {
    assertPaymentReferences, mockPaymentKey, OrderPaymentError, paymentEligibility,
    payApprovedOrder, validateMockPayment,
    type ApprovalStatus, type MockPaymentStore,
} from './order-mock-payment-core';

export function mockOrderPaymentEnabled() {
    return process.env.NODE_ENV === 'development';
}

const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getPayment(key: string): Promise<Payment | undefined> {
    try {
        return (await associateApiRoot.withProjectKey({ projectKey: process.env.CT_PROJECT_KEY! })
            .payments().withKey({ key }).get().execute()).body;
    } catch (error) {
        if ((error as { statusCode?: number })?.statusCode === 404) return undefined;
        throwPaymentError(error);
    }
}

function throwPaymentError(error: unknown): never {
    if ((error as { statusCode?: number })?.statusCode === 403) {
        throw new OrderPaymentError('paymentScope', 503);
    }
    throw error;
}

async function paymentContext(orderId: string) {
    if (!ID_PATTERN.test(orderId)) throw new OrderPaymentError('invalidOrder', 400);
    if (!await getSession()) throw new OrderPaymentError('unauthorized', 401);
    const context = await getSelectedBusinessUnit();
    if (!context) throw new OrderPaymentError('selectUnit', 403);
    const { unit, customerId } = context;
    const assignments = [
        ...(unit.associates ?? []),
        ...(unit.associateMode === 'ExplicitAndFromParent' ? unit.inheritedAssociates ?? [] : []),
    ].filter(({ customer }) => customer.id === customerId);
    const keys = new Set(assignments.flatMap(({ associateRoleAssignments }) =>
        associateRoleAssignments.map(({ associateRole }) => associateRole.key)));
    const roles = await Promise.all([...keys].map(async (key) =>
        (await associateApiRoot.withProjectKey({ projectKey: process.env.CT_PROJECT_KEY! })
            .associateRoles().withKey({ key }).get().execute()).body));
    // There is no "PayOrder" Associate permission. Require ownership and an actual order-update permission.
    const canPay = roles.some((role) => keys.has(role.key) &&
        role.permissions.some((permission) => permission === 'UpdateMyOrders' || permission === 'UpdateOthersOrders'));
    const orders = associateInUnit(customerId, unit.key).orders();
    return { customerId, unitKey: unit.key, canPay, orders };
}

function storeFor(context: Awaited<ReturnType<typeof paymentContext>>, orderId: string): MockPaymentStore {
    const payments = associateApiRoot.withProjectKey({ projectKey: process.env.CT_PROJECT_KEY! }).payments();
    return {
        async snapshot() {
            // Revalidate membership and permissions across the multi-resource operation.
            const current = await paymentContext(orderId);
            if (current.customerId !== context.customerId || current.unitKey !== context.unitKey) {
                throw new OrderPaymentError('unauthorized', 403);
            }
            const order = (await current.orders.withId({ ID: orderId }).get().execute()).body;
            if (order.customerId !== current.customerId || order.businessUnit?.key !== current.unitKey) {
                throw new OrderPaymentError('unauthorized', 403);
            }
            const query = new URLSearchParams({ where: `order(id=${JSON.stringify(orderId)})`, limit: '2' });
            const response = await associateClient.execute<{ results: { status: ApprovalStatus }[]; total: number }>({
                method: 'GET',
                uri: `/${encodeURIComponent(process.env.CT_PROJECT_KEY!)}/as-associate/${encodeURIComponent(current.customerId)}/in-business-unit/key=${encodeURIComponent(current.unitKey)}/approval-flows?${query}`,
            });
            if (!response.body) throw new OrderPaymentError('approvalUnavailable', 502);
            const status = response.body.results.length === 1 ? response.body.results[0].status : 'Unknown';
            const approval: ApprovalStatus = ['Pending', 'Approved', 'Rejected'].includes(status) ? status : 'Unknown';
            return { order, approval, customerId: current.customerId, unitKey: current.unitKey, canPay: current.canPay };
        },
        findPayment: getPayment,
        async createPayment(draft) {
            try {
                return (await payments.post({ body: draft }).execute()).body;
            } catch (error) {
                throwPaymentError(error);
            }
        },
        async updatePayment(payment, actions) {
            try {
                return (await payments.withId({ ID: payment.id }).post({
                    body: { version: payment.version, actions },
                }).execute()).body;
            } catch (error) {
                throwPaymentError(error);
            }
        },
        async updateOrder(order, actions) {
            return (await context.orders.withId({ ID: order.id }).post({
                body: { version: order.version, actions },
            }).execute()).body;
        },
    };
}

export async function getOrderPaymentDetails(orderId: string) {
    const context = await paymentContext(orderId);
    const store = storeFor(context, orderId);
    const snapshot = await store.snapshot();
    let eligibility = paymentEligibility(snapshot.order, snapshot.approval);
    if (!snapshot.canPay && eligibility === 'eligible') eligibility = 'blocked';
    if (eligibility === 'eligible' && mockOrderPaymentEnabled()) {
        const payment = await getPayment(mockPaymentKey(orderId));
        try {
            assertPaymentReferences(snapshot.order, payment?.id);
            if (payment) validateMockPayment(payment, snapshot);
        } catch (error) {
            if (!(error instanceof OrderPaymentError)) throw error;
            eligibility = 'blocked';
        }
    }
    return { ...snapshot, eligibility, enabled: mockOrderPaymentEnabled() };
}

export async function simulateOrderPayment(orderId: string): Promise<Order> {
    if (!mockOrderPaymentEnabled()) throw new OrderPaymentError('disabled', 404);
    const context = await paymentContext(orderId);
    if (!context.canPay) throw new OrderPaymentError('unauthorized', 403);
    return payApprovedOrder(storeFor(context, orderId));
}
