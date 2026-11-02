'use server';

import { apiRoot } from './commercetools';
import { getSession } from './auth';
import {
    lineItemSearchTerms,
    matchesSearch,
    QUOTES_PAGE_SIZE,
    QUOTES_SEARCH_LIMIT,
    type QuoteListOptions,
} from './quote-utils';

const projectKey = process.env.CT_PROJECT_KEY || '';

export async function getMyQuotes({
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
            .quotes()
            .get({
                queryArgs: {
                    where: `customer(id = "${customerId}")`,
                    sort: 'createdAt desc',
                    ...(query
                        ? { limit: QUOTES_SEARCH_LIMIT }
                        : { limit, offset, withTotal: true }),
                }
            })
            .execute();

        const { results } = response.body;

        if (!query) {
            return {
                success: true,
                quotes: results,
                total: response.body.total ?? results.length,
            };
        }

        const matches = results.filter((quote) =>
            matchesSearch(
                [
                    quote.id,
                    quote.key,
                    quote.quoteState,
                    quote.buyerComment,
                    quote.sellerComment,
                    quote.purchaseOrderNumber,
                    ...lineItemSearchTerms(quote.lineItems),
                ],
                query,
            ),
        );

        return {
            success: true,
            quotes: matches.slice(offset, offset + limit),
            total: matches.length,
        };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch quotes';
        console.error('Error fetching quotes:', error);
        return {
            success: false,
            error: errorMessage,
        };
    }
}

export async function getQuoteById(quoteId: string) {
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
            .quotes()
            .withId({ ID: quoteId })
            .get()
            .execute();

        const quote = response.body;

        if (quote.customer?.id !== customerId) {
            return {
                success: false,
                error: 'Quote not found',
            };
        }

        return {
            success: true,
            quote,
        };
    } catch (error: unknown) {
        console.error('Error fetching quote by ID:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch quote',
        };
    }
}
