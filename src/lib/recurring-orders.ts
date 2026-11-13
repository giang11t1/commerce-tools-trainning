import 'server-only';

import type {
    Order,
    RecurringOrder,
    RecurringOrderUpdateAction,
} from '@commercetools/platform-sdk';
import { cookies } from 'next/headers';
import { apiRoot } from './commercetools';
import { getSession } from './auth';
import { getCustomerById } from './customer';

export type RecurringOrderAction =
    | 'pause'
    | 'resume'
    | 'cancel'
    | 'skip';

export class RecurringOrderActionError extends Error {
    constructor(
        message: string,
        readonly status: number,
        readonly code:
            | 'not-found'
            | 'invalid-state'
            | 'skip-pending'
            | 'invalid-store',
    ) {
        super(message);
        this.name = 'RecurringOrderActionError';
    }
}

async function getCustomerContext() {
    const customerId = await getSession();
    if (!customerId) {
        throw new RecurringOrderActionError('Authentication required.', 401, 'not-found');
    }

    const customer = await getCustomerById(customerId);
    if (!customer) {
        throw new RecurringOrderActionError('Authentication required.', 401, 'not-found');
    }

    const customerStoreKeys =
        customer.stores?.map((store) => store.key).filter(Boolean) ?? [];
    const sessionStoreKey = (await cookies())
        .get('ct_customer_store_key')?.value;

    if (sessionStoreKey && !customerStoreKeys.includes(sessionStoreKey)) {
        throw new RecurringOrderActionError(
            'The active store does not belong to this customer.',
            403,
            'invalid-store',
        );
    }
    if (!sessionStoreKey && customerStoreKeys.length > 1) {
        throw new RecurringOrderActionError(
            'A store must be selected for this customer.',
            400,
            'invalid-store',
        );
    }

    return {
        customerId,
        storeKey: sessionStoreKey ?? customerStoreKeys[0],
    };
}

function getCustomerWhere(customerId: string, storeKey?: string) {
    const predicates = [`customer(id=${JSON.stringify(customerId)})`];
    if (storeKey) {
        predicates.push(`store(key=${JSON.stringify(storeKey)})`);
    }
    return predicates.join(' and ');
}

export async function getMyRecurringOrders(): Promise<RecurringOrder[]> {
    const context = await getCustomerContext();
    const orders: RecurringOrder[] = [];
    const limit = 100;
    let offset = 0;

    while (true) {
        const response = await apiRoot
            .withProjectKey({ projectKey: process.env.CT_PROJECT_KEY! })
            .recurringOrders()
            .get({
                queryArgs: {
                    where: getCustomerWhere(context.customerId, context.storeKey),
                    limit,
                    offset,
                    sort: 'createdAt desc',
                },
            })
            .execute();
        orders.push(...response.body.results);
        offset += response.body.count;

        if (
            response.body.count === 0 ||
            response.body.count < limit ||
            (response.body.total !== undefined && offset >= response.body.total)
        ) {
            return orders;
        }
    }
}

export async function getMyRecurringOrder(
    recurringOrderId: string,
): Promise<RecurringOrder | undefined> {
    const context = await getCustomerContext();
    const where = [
        `id=${JSON.stringify(recurringOrderId)}`,
        getCustomerWhere(context.customerId, context.storeKey),
    ].join(' and ');
    const response = await apiRoot
        .withProjectKey({ projectKey: process.env.CT_PROJECT_KEY! })
        .recurringOrders()
        .get({
            queryArgs: {
                where,
                limit: 1,
                expand: ['cart'],
            },
        })
        .execute();

    return response.body.results[0];
}

export async function getMyRecurringOrderOrders(
    recurringOrderId: string,
): Promise<Order[]> {
    const recurringOrder = await getMyRecurringOrder(recurringOrderId);
    if (!recurringOrder) return [];

    const context = await getCustomerContext();
    const projectKey = process.env.CT_PROJECT_KEY!;
    const predicates = [
        `recurringOrder(id=${JSON.stringify(recurringOrderId)})`,
        `customerId=${JSON.stringify(context.customerId)}`,
    ];
    if (context.storeKey) {
        predicates.push(`store(key=${JSON.stringify(context.storeKey)})`);
    }

    const orders: Order[] = [];
    const limit = 100;
    let offset = 0;

    while (true) {
        const response = await apiRoot
            .withProjectKey({ projectKey })
            .orders()
            .get({
                queryArgs: {
                    where: predicates.join(' and '),
                    limit,
                    offset,
                    sort: 'createdAt desc',
                },
            })
            .execute();
        orders.push(...response.body.results);
        offset += response.body.count;

        if (
            response.body.count === 0 ||
            response.body.count < limit ||
            (response.body.total !== undefined && offset >= response.body.total)
        ) {
            break;
        }
    }
    const originOrderId = recurringOrder.originOrder?.id;

    if (originOrderId && !orders.some((order) => order.id === originOrderId)) {
        try {
            const originOrderResponse = await apiRoot
                .withProjectKey({ projectKey })
                .orders()
                .withId({ ID: originOrderId })
                .get()
                .execute();
            const originOrder = originOrderResponse.body;
            if (
                originOrder.customerId === context.customerId &&
                (!context.storeKey || originOrder.store?.key === context.storeKey)
            ) {
                orders.push(originOrder);
            }
        } catch (error) {
            if ((error as { statusCode?: number })?.statusCode !== 404) {
                throw error;
            }
        }
    }

    return orders.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}

export async function updateMyRecurringOrder(
    recurringOrderId: string,
    action: RecurringOrderAction,
): Promise<RecurringOrder> {
    const recurringOrder = await getMyRecurringOrder(recurringOrderId);
    if (!recurringOrder) {
        throw new RecurringOrderActionError(
            'Recurring order not found.',
            404,
            'not-found',
        );
    }

    let updateAction: RecurringOrderUpdateAction;
    switch (action) {
        case 'pause':
            if (recurringOrder.recurringOrderState !== 'Active') {
                throw new RecurringOrderActionError(
                    'This recurring order cannot be paused in its current state.',
                    409,
                    'invalid-state',
                );
            }
            updateAction = {
                action: 'setRecurringOrderState',
                recurringOrderState: { type: 'paused' },
            };
            break;
        case 'resume':
            if (recurringOrder.recurringOrderState !== 'Paused') {
                throw new RecurringOrderActionError(
                    'This recurring order cannot be resumed in its current state.',
                    409,
                    'invalid-state',
                );
            }
            updateAction = {
                action: 'setRecurringOrderState',
                recurringOrderState: { type: 'active' },
            };
            break;
        case 'cancel':
            if (!['Active', 'Paused'].includes(recurringOrder.recurringOrderState)) {
                throw new RecurringOrderActionError(
                    'This recurring order cannot be canceled in its current state.',
                    409,
                    'invalid-state',
                );
            }
            updateAction = {
                action: 'setRecurringOrderState',
                recurringOrderState: { type: 'canceled' },
            };
            break;
        case 'skip': {
            if (recurringOrder.recurringOrderState !== 'Active') {
                throw new RecurringOrderActionError(
                    'This recurring order cannot skip an order in its current state.',
                    409,
                    'invalid-state',
                );
            }
            const skipConfiguration = recurringOrder.skipConfiguration;
            if (
                skipConfiguration &&
                skipConfiguration.totalToSkip > skipConfiguration.skipped
            ) {
                throw new RecurringOrderActionError(
                    'A future order is already scheduled to be skipped.',
                    409,
                    'skip-pending',
                );
            }
            updateAction = {
                action: 'setOrderSkipConfiguration',
                skipConfigurationInputDraft: {
                    type: 'Counter',
                    totalToSkip: (skipConfiguration?.skipped ?? 0) + 1,
                },
            };
            break;
        }
    }

    const response = await apiRoot
        .withProjectKey({ projectKey: process.env.CT_PROJECT_KEY! })
        .recurringOrders()
        .withId({ ID: recurringOrder.id })
        .post({
            body: {
                version: recurringOrder.version,
                actions: [updateAction],
            },
        })
        .execute();

    return response.body;
}
