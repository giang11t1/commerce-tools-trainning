'use server';

import { apiRoot } from './commercetools';
import { getSession } from './auth';
import { isOrderOwnedByCustomer } from './order-access';
import { isCommercetoolsNotFound } from './cart-lifecycle';

const projectKey = process.env.CT_PROJECT_KEY || '';

export async function getMyOrders(limit?: number) {
    try {
        const customerId = await getSession();

        if (!customerId) {
            return {
                success: false,
                error: 'Unauthorized',
            };
        }

        const response = await apiRoot
            .withProjectKey({ projectKey })
            .orders()
            .get({
                queryArgs: {
                    where: `customerId = "${customerId}"`,
                    sort: 'createdAt desc',
                    ...(limit !== undefined && { limit }),
                }
            })
            .execute();

        return {
            success: true,
            orders: response.body.results,
        };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch orders';
        console.error('Error fetching orders:', error);
        return {
            success: false,
            error: errorMessage,
        };
    }
}

export async function getOrderById(orderId: string) {
    try {
        const customerId = await getSession();

        if (!customerId) {
            return {
                success: false,
                error: 'Unauthorized',
            };
        }

        const response = await apiRoot
            .withProjectKey({ projectKey })
            .orders()
            .withId({ ID: orderId })
            .get()
            .execute();

        const order = response.body;

        // Security check: ensure the order belongs to the logged-in customer
        if (!isOrderOwnedByCustomer(order, customerId)) {
            return {
                success: false,
                error: 'Order not found',
            };
        }

        return {
            success: true,
            order,
        };
    } catch (error: unknown) {
        if (isCommercetoolsNotFound(error)) {
            return {
                success: false,
                error: 'Order not found',
            };
        }

        console.error('Error fetching order by ID:', error);
        throw error;
    }
}
