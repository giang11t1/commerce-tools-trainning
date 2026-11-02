'use server';

import { cookies } from 'next/headers';
import type { QuoteRequest, QuoteRequestDraft } from '@commercetools/platform-sdk';
import { apiRoot } from './commercetools';
import { getSession } from './auth';
import { getOrCreateCart } from './cart';
import {
    lineItemSearchTerms,
    matchesSearch,
    QUOTES_PAGE_SIZE,
    QUOTES_SEARCH_LIMIT,
    type QuoteListOptions,
} from './quote-utils';

const projectKey = process.env.CT_PROJECT_KEY || '';
const CART_COOKIE = 'cartId';

export type CreateQuoteRequestResult =
    | { success: true; quoteRequest: QuoteRequest }
    | { success: false; error: string; requiresLogin?: boolean };

function getErrorMessage(error: unknown, fallback: string) {
    if (error && typeof error === 'object') {
        const body = (error as { body?: { message?: string } }).body;

        if (body?.message) {
            return body.message;
        }
    }

    if (error instanceof Error && error.message) {
        return error.message;
    }

    return fallback;
}

/**
 * Create a Quote Request from the current customer's cart.
 *
 * The Quote Request shows up in the Merchant Center (Orders > Quote requests)
 * where a sales rep can create a Staged Quote and send a Quote to the buyer.
 */
export async function createQuoteRequest({
    comment,
    purchaseOrderNumber,
}: {
    comment?: string;
    purchaseOrderNumber?: string;
}): Promise<CreateQuoteRequestResult> {
    const customerId = await getSession();

    if (!customerId) {
        return {
            success: false,
            error: 'Please log in to request a quote',
            requiresLogin: true,
        };
    }

    try {
        // Ensures the cart is assigned to the customer (and their store).
        const cart = await getOrCreateCart();

        if (cart.customerId !== customerId) {
            return { success: false, error: 'Cart does not belong to the current customer' };
        }

        if (cart.lineItems.length === 0) {
            return { success: false, error: 'Your cart is empty' };
        }

        // commercetools does not support Quote Requests for carts with discount codes.
        if (cart.discountCodes.length > 0) {
            return {
                success: false,
                error: 'couponErrorRemoveForQuote',
            };
        }

        const trimmedComment = comment?.trim();
        const trimmedPurchaseOrderNumber = purchaseOrderNumber?.trim();

        const draft: QuoteRequestDraft = {
            cart: {
                typeId: 'cart',
                id: cart.id,
            },
            cartVersion: cart.version,
            ...(trimmedComment && { comment: trimmedComment }),
            ...(trimmedPurchaseOrderNumber && {
                purchaseOrderNumber: trimmedPurchaseOrderNumber,
            }),
        };

        // Store carts must be requested through the store-specific endpoint.
        const project = apiRoot.withProjectKey({ projectKey });
        const quoteRequests = cart.store?.key
            ? project.inStoreKeyWithStoreKeyValue({ storeKey: cart.store.key }).quoteRequests()
            : project.quoteRequests();

        const response = await quoteRequests
            .post({ body: draft })
            .execute();

        // The cart now backs the Quote Request; start a fresh cart for further shopping.
        const cookieStore = await cookies();
        cookieStore.delete(CART_COOKIE);

        return {
            success: true,
            quoteRequest: response.body,
        };
    } catch (error: unknown) {
        console.error('Error creating quote request:', error);

        return {
            success: false,
            error: getErrorMessage(error, 'Failed to create quote request'),
        };
    }
}

export async function getMyQuoteRequests({
    search,
    page = 1,
    limit = QUOTES_PAGE_SIZE,
}: QuoteListOptions = {}) {
    try {
        const customerId = await getSession();

        if (!customerId) {
            return {
                success: false,
                error: 'Unauthorized',
            };
        }

        const query = search?.trim();
        const offset = (page - 1) * limit;

        const response = await apiRoot
            .withProjectKey({ projectKey })
            .quoteRequests()
            .get({
                queryArgs: {
                    where: `customer(id = "${customerId}")`,
                    sort: 'createdAt desc',
                    ...(query
                        ? { limit: QUOTES_SEARCH_LIMIT }
                        : { limit, offset, withTotal: true }),
                },
            })
            .execute();

        const { results } = response.body;

        if (!query) {
            return {
                success: true,
                quoteRequests: results,
                total: response.body.total ?? results.length,
            };
        }

        const matches = results.filter((quoteRequest) =>
            matchesSearch(
                [
                    quoteRequest.id,
                    quoteRequest.key,
                    quoteRequest.quoteRequestState,
                    quoteRequest.comment,
                    quoteRequest.purchaseOrderNumber,
                    ...lineItemSearchTerms(quoteRequest.lineItems),
                ],
                query,
            ),
        );

        return {
            success: true,
            quoteRequests: matches.slice(offset, offset + limit),
            total: matches.length,
        };
    } catch (error: unknown) {
        console.error('Error fetching quote requests:', error);

        return {
            success: false,
            error: getErrorMessage(error, 'Failed to fetch quote requests'),
        };
    }
}

export async function getQuoteRequestById(quoteRequestId: string) {
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
            .quoteRequests()
            .withId({ ID: quoteRequestId })
            .get()
            .execute();

        const quoteRequest = response.body;

        if (quoteRequest.customer?.id !== customerId) {
            return {
                success: false,
                error: 'Quote request not found',
            };
        }

        return {
            success: true,
            quoteRequest,
        };
    } catch (error: unknown) {
        console.error('Error fetching quote request by ID:', error);

        return {
            success: false,
            error: getErrorMessage(error, 'Failed to fetch quote request'),
        };
    }
}
