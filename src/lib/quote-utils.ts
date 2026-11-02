export function quoteStateBadgeClass(state: string) {
    switch (state) {
        case 'Accepted':
            return 'bg-green-100 text-green-800';
        case 'Declined':
        case 'Withdrawn':
            return 'bg-red-100 text-red-800';
        case 'Pending':
        case 'RenegotiationAddressed':
            return 'bg-yellow-100 text-yellow-800';
        case 'DeclinedForRenegotiation':
            return 'bg-orange-100 text-orange-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
}

export function quoteRequestStateBadgeClass(state: string) {
    switch (state) {
        case 'Accepted':
            return 'bg-green-100 text-green-800';
        case 'Rejected':
        case 'Cancelled':
            return 'bg-red-100 text-red-800';
        case 'Submitted':
            return 'bg-yellow-100 text-yellow-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
}

export function formatMoney(centAmount: number, currencyCode: string) {
    return (centAmount / 100).toLocaleString('en-US', {
        style: 'currency',
        currency: currencyCode,
    });
}

export const QUOTES_PAGE_SIZE = 5;

// commercetools query predicates have no substring matching, so searches load up to
// this many of the customer's records and filter them in memory.
export const QUOTES_SEARCH_LIMIT = 500;

export interface QuoteListOptions {
    search?: string;
    page?: number;
    limit?: number;
}

export function parsePage(value?: string) {
    const page = parseInt(value || '1', 10);

    return Number.isFinite(page) && page > 0 ? page : 1;
}

export function lineItemSearchTerms(
    lineItems: { name: Record<string, string>; variant: { sku?: string } }[],
) {
    return lineItems.flatMap((item) => [...Object.values(item.name), item.variant.sku]);
}

export function matchesSearch(terms: (string | undefined)[], search: string) {
    const needle = search.toLowerCase();

    return terms.some((term) => term?.toLowerCase().includes(needle));
}
